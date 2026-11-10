import { ConvexError, v } from "convex/values";
import { nameSchema } from "../shared/budget";
import { getLimaDate, isoDateSchema } from "../shared/dates";
import { displayName } from "../shared/household";
import { cycleLabel, isValidPlan } from "../shared/plan";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { authComponent } from "./auth";
import { createFirstCycle, getCycleAt, getLatestClosed } from "./model/cycles";
import { logEvent } from "./model/events";
import { parseInput } from "./model/input";
import { getPayerId, householdHasPlus, requirePlus, requireWritableSpace } from "./model/plus";
import {
	checkAccess,
	getHousehold,
	getMemberIds,
	getMembers,
	getPersonalSpace,
	requirePlan,
	requireSpace,
	requireUser,
} from "./model/spaces";
import { limitHouseholdJoin } from "./rateLimits";
import { plan } from "./schema";

const NOT_FOUND = "No encontramos este dato.";
const NEED_HOUSEHOLD = "Aún no tienes un hogar.";
const ALREADY_IN = "Ya formas parte de un hogar.";
const ALONE = "Tu pareja aún no entra.";
const NOT_EMPTY = "Tu hogar ya tiene movimientos. No lo podemos borrar desde aquí.";
const MAX_EMPTY_CYCLES = 120;
const MAX_EMPTY_EVENTS = 200;
const DEFAULT_NAME = "Nuestro espacio";
const FULL = "Nuestro espacio ya tiene dos personas.";
const INVITE_MS = 7 * 24 * 60 * 60 * 1000;
const HOUSEHOLD_SPLIT = { needs: 50, wants: 30, savings: 20 };
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const joinResult = v.union(
	v.object({ ok: v.literal(true) }),
	v.object({
		ok: v.literal(false),
		reason: v.union(
			v.literal("invalid"),
			v.literal("expired"),
			v.literal("full"),
			v.literal("rate_limited"),
		),
	}),
);

function randomCode() {
	const bytes = new Uint8Array(6);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

const normalizeCode = (code: string) => code.replace(/\s/g, "").toUpperCase();

/** Only you, no money in the fund, and nothing recorded in any cycle, commitment or goal. */
async function isEmptyHousehold(ctx: QueryCtx, space: Doc<"spaces">) {
	if (space.fundCents !== 0 || (await getMemberIds(ctx, space._id)).length !== 1) return false;
	const [commitment, goal, cycles] = await Promise.all([
		ctx.db
			.query("commitments")
			.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
			.first(),
		ctx.db
			.query("goals")
			.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
			.first(),
		ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", space._id))
			.take(MAX_EMPTY_CYCLES + 1),
	]);
	if (commitment || goal || cycles.length > MAX_EMPTY_CYCLES) return false;
	for (const cycle of cycles) {
		const row = await ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.first();
		if (row) return false;
	}
	return true;
}

/**
 * The latest fund withdrawal by the other person that this person has not dismissed. It walks back
 * from the newest and stops at the first one by the other or at what was already seen, so any
 * number of their own withdrawals in between cannot hide it.
 */
async function unseenPartnerWithdrawal(ctx: QueryCtx, spaceId: Id<"spaces">, userId: string) {
	const profile = await ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();
	const seenAt = profile?.seenWithdrawalAt ?? 0;
	const withdrawals = ctx.db
		.query("transactions")
		.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", spaceId).eq("kind", "withdrawal"))
		.order("desc");
	for await (const event of withdrawals) {
		if (event._creationTime <= seenAt) return null;
		if (event.userId !== userId) return event;
	}
	return null;
}

/** Deletes an empty household: its cycles, its member and the space. */
async function deleteEmptyHousehold(ctx: MutationCtx, space: Doc<"spaces">) {
	const cycles = await ctx.db
		.query("cycles")
		.withIndex("by_space_start", (q) => q.eq("spaceId", space._id))
		.take(MAX_EMPTY_CYCLES);
	for (const cycle of cycles) await ctx.db.delete("cycles", cycle._id);
	const events = await ctx.db
		.query("spaceEvents")
		.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
		.take(MAX_EMPTY_EVENTS);
	for (const event of events) await ctx.db.delete("spaceEvents", event._id);
	for (const member of await getMembers(ctx, space._id)) {
		await ctx.db.delete("spaceMembers", member._id);
	}
	await ctx.db.delete("spaces", space._id);
}

/** Replaces any earlier code, so a resend kills the old one. */
async function issueInvite(ctx: MutationCtx, spaceId: Id<"spaces">) {
	let code = randomCode();
	for (let i = 0; i < 8; i++) {
		const clash = await ctx.db
			.query("spaces")
			.withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
			.first();
		if (!clash) break;
		code = randomCode();
	}
	await ctx.db.patch("spaces", spaceId, {
		inviteCode: code,
		inviteExpiresAt: Date.now() + INVITE_MS,
	});
	return { code };
}

export const createHousehold = mutation({
	args: { name: v.optional(v.string()) },
	returns: v.object({ code: v.string() }),
	handler: async (ctx, { name }) => {
		const user = await requireUser(ctx);
		await requirePlus(ctx, user._id);
		if (await getHousehold(ctx, user._id)) throw new ConvexError(ALREADY_IN);

		const personal = await getPersonalSpace(ctx, user._id);
		if (!personal) throw new ConvexError("Termina tus primeros pasos.");
		const plan = await requirePlan(ctx, personal);

		const trimmed = name?.trim();
		const spaceId = await ctx.db.insert("spaces", {
			kind: "household",
			ownerId: user._id,
			fundCents: 0,
			// The household cycle is its own: it starts like the creator's, then goes its own way.
			cadence: plan.cadence,
			cycleStartDay: plan.cycleStartDay,
			...(trimmed ? { name: trimmed } : {}),
		});
		await ctx.db.insert("spaceMembers", { spaceId, userId: user._id, joinedAt: Date.now() });
		await createFirstCycle(ctx, spaceId, plan, HOUSEHOLD_SPLIT, getLimaDate());
		return await issueInvite(ctx, spaceId);
	},
});

export const createInvite = mutation({
	args: {},
	returns: v.object({ code: v.string() }),
	handler: async (ctx) => {
		const { userId, space } = await requireSpace(ctx, "household");
		if (space.ownerId !== userId) throw new ConvexError(NOT_FOUND);
		if ((await getMemberIds(ctx, space._id)).length >= 2) throw new ConvexError(FULL);
		return await issueInvite(ctx, space._id);
	},
});

export const joinHousehold = mutation({
	// `replaceEmpty`: leave and delete your own household if it is empty, then join this one.
	args: { code: v.string(), replaceEmpty: v.optional(v.boolean()) },
	returns: joinResult,
	handler: async (ctx, { code, replaceEmpty }) => {
		const user = await requireUser(ctx);
		// Consume the attempt first so a soft failure still counts toward the limit.
		if (!(await limitHouseholdJoin(ctx, user._id))) {
			return { ok: false as const, reason: "rate_limited" as const };
		}

		const normalized = normalizeCode(code);
		if (normalized.length !== 6) return { ok: false as const, reason: "invalid" as const };
		const mine = await getHousehold(ctx, user._id);
		if (mine && !replaceEmpty) throw new ConvexError(ALREADY_IN);

		const space = await ctx.db
			.query("spaces")
			.withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalized))
			.unique();
		if (space?.kind !== "household") {
			return { ok: false as const, reason: "invalid" as const };
		}
		if (!((space.inviteExpiresAt ?? 0) > Date.now())) {
			return { ok: false as const, reason: "expired" as const };
		}

		if ((await getMemberIds(ctx, space._id)).length >= 2)
			return { ok: false as const, reason: "full" as const };

		// The code is good: only now can anything be deleted.
		if (mine) {
			if (mine._id === space._id) throw new ConvexError(ALREADY_IN);
			if (!(await isEmptyHousehold(ctx, mine))) throw new ConvexError(NOT_EMPTY);
			await deleteEmptyHousehold(ctx, mine);
		}

		await ctx.db.insert("spaceMembers", {
			spaceId: space._id,
			userId: user._id,
			joinedAt: Date.now(),
		});
		// Closes before this person arrived are not news for them.
		const latestClosed = await getLatestClosed(ctx, space._id);
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.unique();
		if (profile) {
			await ctx.db.patch("profiles", profile._id, {
				seenWithdrawalAt: Date.now(),
				...(latestClosed ? { lastSeenHouseholdClosedCycleId: latestClosed._id } : {}),
			});
		}
		// Invalidate the code without clearing optional fields (patch can't unset).
		await ctx.db.patch("spaces", space._id, { inviteExpiresAt: 0, partnerLeft: undefined });
		return { ok: true as const };
	},
});

export const leaveHousehold = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const user = await requireUser(ctx);
		const membership = await ctx.db
			.query("spaceMembers")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.first();
		if (!membership) throw new ConvexError(NEED_HOUSEHOLD);
		const space = await ctx.db.get("spaces", membership.spaceId);
		if (!space) throw new ConvexError(NEED_HOUSEHOLD);
		const partnerId = (await getMemberIds(ctx, space._id)).find((id) => id !== user._id);
		if (!partnerId) throw new ConvexError(ALONE);
		await ctx.db.delete("spaceMembers", membership._id);
		// What was shared stays with who stays, who also takes over inviting.
		await ctx.db.patch("spaces", space._id, {
			partnerLeft: { name: displayName(user.name) },
			...(space.ownerId === user._id ? { ownerId: partnerId } : {}),
		});
		return null;
	},
});

export const dismissWithdrawalNotice = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const { userId, space } = await requireSpace(ctx, "household");
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
		const event = await unseenPartnerWithdrawal(ctx, space._id, userId);
		if (profile && event) {
			await ctx.db.patch("profiles", profile._id, { seenWithdrawalAt: event._creationTime });
		}
		return null;
	},
});

export const dismissPartnerLeft = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const { space } = await requireSpace(ctx, "household");
		await ctx.db.patch("spaces", space._id, { partnerLeft: undefined });
		return null;
	},
});

/** Both can rename the household. */
export const rename = mutation({
	args: { name: v.string() },
	returns: v.null(),
	handler: async (ctx, { name }) => {
		const { userId, space } = await requireWritableSpace(ctx, "household");
		const cleanName = parseInput(nameSchema, name);
		await ctx.db.patch("spaces", space._id, { name: cleanName });
		const before = space.name ?? DEFAULT_NAME;
		if (before !== cleanName) {
			await logEvent(ctx, space, userId, "renamed", { before, after: cleanName });
		}
		return null;
	},
});

/** The open cycle keeps its dates: the new cycle only applies when the next one is created. */
export const updateCycle = mutation({
	args: { cadence: plan.fields.cadence, cycleStartDay: plan.fields.cycleStartDay },
	returns: v.null(),
	handler: async (ctx, { cadence, cycleStartDay }) => {
		const { userId, space } = await requireWritableSpace(ctx, "household");
		if (!isValidPlan({ cadence, cycleStartDay })) {
			throw new ConvexError("Revisa los datos e inténtalo otra vez.");
		}
		const before = await requirePlan(ctx, space);
		await ctx.db.patch("spaces", space._id, { cadence, cycleStartDay });
		if (before.cadence !== cadence || before.cycleStartDay !== cycleStartDay) {
			await logEvent(ctx, space, userId, "cycle_changed", {
				before: cycleLabel(before),
				after: cycleLabel({ cadence, cycleStartDay }),
			});
		}
		return null;
	},
});

export const get = query({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			name: v.union(v.string(), v.null()),
			isOwner: v.boolean(),
			partnerName: v.union(v.string(), v.null()),
			partnerJoinedAt: v.union(v.number(), v.null()),
			cycle: v.object({ cadence: plan.fields.cadence, cycleStartDay: plan.fields.cycleStartDay }),
			partnerLeft: v.union(v.string(), v.null()),
			// The other person's latest withdrawal from the fund, until this person dismisses it.
			withdrawalNotice: v.union(v.object({ name: v.string(), amountCents: v.number() }), v.null()),
			// Only for who created the household, while nobody has joined. The page decides if it expired:
			// a query does not run again when time passes.
			invite: v.union(v.object({ code: v.string(), expiresAt: v.number() }), v.null()),
			// A household without Plus can be read but not written. Null `payerName`: nobody has Plus on record.
			plus: v.object({
				active: v.boolean(),
				payerName: v.union(v.string(), v.null()),
				payerIsMe: v.boolean(),
			}),
		}),
	),
	handler: async (ctx) => {
		const user = await checkAccess(ctx);
		if (!user) return null;
		const space = await getHousehold(ctx, user._id);
		if (!space) return null;

		const partnerMember = (await getMembers(ctx, space._id)).find((m) => m.userId !== user._id);
		const partnerId = partnerMember?.userId;
		const partner = partnerId ? await authComponent.getAnyUserById(ctx, partnerId) : null;
		const { inviteCode, inviteExpiresAt } = space;
		const isOwner = space.ownerId === user._id;
		const withdrawal = await unseenPartnerWithdrawal(ctx, space._id, user._id);
		const payerId = await getPayerId(ctx, space);
		const payer = payerId ? await authComponent.getAnyUserById(ctx, payerId) : null;
		const withdrawer = withdrawal
			? await authComponent.getAnyUserById(ctx, withdrawal.userId)
			: null;

		return {
			name: space.name ?? null,
			isOwner,
			partnerName: partner ? displayName(partner.name) : null,
			partnerJoinedAt: partnerMember?.joinedAt ?? null,
			cycle: await requirePlan(ctx, space),
			partnerLeft: space.partnerLeft?.name ?? null,
			withdrawalNotice: withdrawal
				? {
						name: withdrawer ? displayName(withdrawer.name) : "",
						amountCents: withdrawal.amountCents,
					}
				: null,
			invite:
				isOwner && !partnerId && inviteCode && inviteExpiresAt
					? { code: inviteCode, expiresAt: inviteExpiresAt }
					: null,
			plus: {
				active: await householdHasPlus(ctx, space._id),
				payerName: payer ? displayName(payer.name) : null,
				payerIsMe: payerId === user._id,
			},
		};
	},
});

/** Alone and with nothing recorded: it can be deleted to join another household. */
export const isEmpty = query({
	args: {},
	returns: v.boolean(),
	handler: async (ctx) => {
		const user = await checkAccess(ctx);
		if (!user) return false;
		const space = await getHousehold(ctx, user._id);
		return space ? await isEmptyHousehold(ctx, space) : false;
	},
});

/** What each one put into this cycle: their direct incomes to the household. */
export const contributions = query({
	args: { today: v.string() },
	returns: v.object({ mineCents: v.number(), partnerCents: v.number() }),
	handler: async (ctx, { today }) => {
		parseInput(isoDateSchema, today);
		const { userId, space } = await requireSpace(ctx, "household");
		const cycle = await getCycleAt(ctx, space._id, today);
		const totals = { mineCents: 0, partnerCents: 0 };
		if (!cycle) return totals;
		// Every row of the cycle: a cap would leave out incomes recorded after it.
		const rows = ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id));
		for await (const row of rows) {
			if (row.kind !== "income" || row.forNextCycle) continue;
			if (row.userId === userId) totals.mineCents += row.amountCents;
			else totals.partnerCents += row.amountCents;
		}
		return totals;
	},
});

/**
 * Public: the invite page shows who invites before the person has an account.
 * `expiresAt` is 0 once the invite was used; the page compares it with the clock.
 */
// oxlint-disable-next-line @convex-dev/require-access-control -- public on purpose: the person has no account yet
export const inviteInfo = query({
	args: { code: v.string() },
	returns: v.union(v.null(), v.object({ inviterName: v.string(), expiresAt: v.number() })),
	handler: async (ctx, { code }) => {
		const space = await ctx.db
			.query("spaces")
			.withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalizeCode(code)))
			.unique();
		if (space?.kind !== "household") return null;
		const inviter = await authComponent.getAnyUserById(ctx, space.ownerId);
		return {
			inviterName: displayName(inviter?.name ?? ""),
			expiresAt: space.inviteExpiresAt ?? 0,
		};
	},
});
