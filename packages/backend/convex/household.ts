import { ConvexError, v } from "convex/values";
import { nameSchema } from "../shared/budget";
import { getLimaDate, isoDateSchema } from "../shared/dates";
import { firstName } from "../shared/household";
import { isValidPlan } from "../shared/plan";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { createFirstCycle, getCycleAt } from "./model/cycles";
import { parseInput } from "./model/input";
import { householdHasPlus, requirePlus, requireWritableSpace } from "./model/plus";
import {
	checkAccess,
	getHousehold,
	getMemberIds,
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
const OWNER_LEAVE = "Eres quien creó el hogar, no puedes salir.";
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
		await ctx.db.insert("spaceMembers", { spaceId, userId: user._id });
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
	args: { code: v.string() },
	returns: joinResult,
	handler: async (ctx, { code }) => {
		const user = await requireUser(ctx);
		// Consume the attempt first so a soft failure still counts toward the limit.
		if (!(await limitHouseholdJoin(ctx, user._id))) {
			return { ok: false as const, reason: "rate_limited" as const };
		}

		const normalized = normalizeCode(code);
		if (normalized.length !== 6) return { ok: false as const, reason: "invalid" as const };
		if (await getHousehold(ctx, user._id)) throw new ConvexError(ALREADY_IN);

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

		await ctx.db.insert("spaceMembers", {
			spaceId: space._id,
			userId: user._id,
		});
		// Invalidate the code without clearing optional fields (patch can't unset).
		await ctx.db.patch("spaces", space._id, { inviteExpiresAt: 0 });
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
		if (space.ownerId === user._id) throw new ConvexError(OWNER_LEAVE);
		await ctx.db.delete("spaceMembers", membership._id);
		return null;
	},
});

/** Both can rename the household. */
export const rename = mutation({
	args: { name: v.string() },
	returns: v.null(),
	handler: async (ctx, { name }) => {
		const { space } = await requireWritableSpace(ctx, "household");
		await ctx.db.patch("spaces", space._id, { name: parseInput(nameSchema, name) });
		return null;
	},
});

/** The open cycle keeps its dates: the new cycle only applies when the next one is created. */
export const updateCycle = mutation({
	args: { cadence: plan.fields.cadence, cycleStartDay: plan.fields.cycleStartDay },
	returns: v.null(),
	handler: async (ctx, { cadence, cycleStartDay }) => {
		const { space } = await requireWritableSpace(ctx, "household");
		if (!isValidPlan({ cadence, cycleStartDay })) {
			throw new ConvexError("Revisa los datos e inténtalo otra vez.");
		}
		await ctx.db.patch("spaces", space._id, { cadence, cycleStartDay });
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
			// Only for who created the household, while nobody has joined. The page decides if it expired:
			// a query does not run again when time passes.
			invite: v.union(v.object({ code: v.string(), expiresAt: v.number() }), v.null()),
			// A household without Plus can be read but not written. `payerName` is null when it is me.
			plus: v.object({ active: v.boolean(), payerName: v.union(v.string(), v.null()) }),
		}),
	),
	handler: async (ctx) => {
		const user = await checkAccess(ctx);
		if (!user) return null;
		const space = await getHousehold(ctx, user._id);
		if (!space) return null;

		const partnerId = (await getMemberIds(ctx, space._id)).find((id) => id !== user._id);
		const partner = partnerId ? await authComponent.getAnyUserById(ctx, partnerId) : null;
		const { inviteCode, inviteExpiresAt } = space;
		const isOwner = space.ownerId === user._id;
		const payer = isOwner ? null : await authComponent.getAnyUserById(ctx, space.ownerId);

		return {
			name: space.name ?? null,
			isOwner,
			partnerName: partner ? firstName(partner.name) : null,
			invite:
				isOwner && !partnerId && inviteCode && inviteExpiresAt
					? { code: inviteCode, expiresAt: inviteExpiresAt }
					: null,
			plus: {
				active: await householdHasPlus(ctx, space._id),
				payerName: payer ? firstName(payer.name) : null,
			},
		};
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
		const rows = cycle
			? await ctx.db
					.query("transactions")
					.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
					.take(500)
			: [];
		const totals = { mineCents: 0, partnerCents: 0 };
		for (const row of rows) {
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
			inviterName: firstName(inviter?.name ?? ""),
			expiresAt: space.inviteExpiresAt ?? 0,
		};
	},
});
