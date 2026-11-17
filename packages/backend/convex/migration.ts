import { v } from "convex/values";
import { GIFT_MS } from "../shared/billing";
import { getCycleRange, getLimaDate } from "../shared/dates";
import { nameSchema } from "../shared/name";
import { isValidPlan, isValidSplit, type Plan } from "../shared/plan";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { summarizeClose } from "./model/closeSummary";
import { MAX_SUMMARY_ROWS } from "./model/cycles";
import { getPersonalSpace } from "./model/spaces";

type Import = Doc<"migrationImports">;
type ImportedCycle = NonNullable<Import["open"]>;

const OPENING_NOTE = "Saldo de la app anterior";
const EXISTING_PAGE = 5;
const STATUS_CAP = 5000;

async function insertCycle(
	ctx: MutationCtx,
	spaceId: Id<"spaces">,
	userId: string,
	split: Import["split"],
	cycle: ImportedCycle,
	endDate: string,
) {
	const cycleId = await ctx.db.insert("cycles", {
		spaceId,
		startDate: cycle.startDate,
		endDate,
		split,
		envelopes: cycle.envelopes,
		carryIn: cycle.carryIn,
	});
	for (const row of cycle.rows) {
		await ctx.db.insert("transactions", { ...row, spaceId, cycleId, userId });
	}
	return cycleId;
}

/** Closes an imported cycle with the same summary a real close writes: "ok" only if it adds up. */
async function closeImported(ctx: MutationCtx, cycleId: Id<"cycles">, closedAt: number) {
	const cycle = await ctx.db.get("cycles", cycleId);
	if (!cycle) throw new Error("Migration claim: cycle insert failed");
	const rows = await ctx.db
		.query("transactions")
		.withIndex("by_cycleId", (q) => q.eq("cycleId", cycleId))
		.take(MAX_SUMMARY_ROWS + 1);
	await ctx.db.patch("cycles", cycleId, {
		closedAt,
		closeSummary:
			rows.length > MAX_SUMMARY_ROWS
				? { status: "tooManyMovements" }
				: summarizeClose(cycle, rows, 0),
	});
}

/** The person's space as it was in the old app. Returns the last closed cycle, if any. */
async function importSpace(
	ctx: MutationCtx,
	userId: string,
	row: Import,
	plan: Plan,
	open: ImportedCycle,
) {
	const spaceId = await ctx.db.insert("spaces", {
		kind: "personal",
		ownerId: userId,
		fundCents: row.fundCents,
	});

	let lastClosed: Id<"cycles"> | undefined;
	let first: { cycleId: Id<"cycles">; date: string } | undefined;
	for (const cycle of row.closed) {
		lastClosed = await insertCycle(ctx, spaceId, userId, row.split, cycle, cycle.endDate);
		await closeImported(ctx, lastClosed, cycle.closedAt);
		first ??= { cycleId: lastClosed, date: cycle.startDate };
	}
	// The old cycle stayed open until the next income; here it ends with the plan's current period.
	const { endDate } = getCycleRange(plan.cadence, plan.cycleStartDay, getLimaDate());
	const openId = await insertCycle(ctx, spaceId, userId, row.split, open, endDate);
	first ??= { cycleId: openId, date: open.startDate };

	for (const goal of row.goals) {
		const goalId = await ctx.db.insert("goals", {
			spaceId,
			name: goal.name,
			targetCents: goal.targetCents,
		});
		// A goal's balance is the sum of its savings; the old app kept only the total.
		if (goal.savedCents > 0) {
			await ctx.db.insert("transactions", {
				kind: "saving",
				spaceId,
				cycleId: first.cycleId,
				userId,
				amountCents: goal.savedCents,
				date: first.date,
				goalId,
				note: OPENING_NOTE,
			});
		}
	}
	for (const commitment of row.commitments) {
		await ctx.db.insert("commitments", {
			spaceId,
			name: commitment.name,
			amountCents: commitment.amountCents,
			envelope: commitment.envelope,
			frequency: "monthly",
			rule: { kind: "day", day: commitment.day },
		});
	}
	return lastClosed;
}

/**
 * Gives the person who signs in with `email` what they had in the old app, once: the Plus gift and,
 * if they had a cycle, their space with its history. Does nothing without a pending row.
 */
export const claim = internalMutation({
	args: { userId: v.string(), email: v.string() },
	returns: v.null(),
	handler: async (ctx, { userId, email }): Promise<null> => {
		const row = await ctx.db
			.query("migrationImports")
			.withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
			.unique();
		if (!row || row.status !== "pending") return null;

		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
		if (!profile) throw new Error("Migration claim: no profile");
		// Never mix with what the person already recorded here.
		if (await getPersonalSpace(ctx, userId)) {
			await ctx.db.patch("migrationImports", row._id, { status: "conflict" });
			return null;
		}
		const { plan, open } = row;
		if (plan && (!isValidPlan(plan) || !isValidSplit(row.split))) {
			throw new Error("Migration claim: invalid plan");
		}

		const now = Date.now();
		await ctx.db.patch("profiles", profile._id, { giftEndsAt: now + GIFT_MS });
		if (plan && open) {
			const name = nameSchema.safeParse(row.name);
			if (name.success) {
				await ctx.runMutation(components.betterAuth.adapter.updateOne, {
					input: {
						model: "user",
						where: [{ field: "_id", value: userId }],
						update: { name: name.data },
					},
				});
			}
			const lastClosed = await importSpace(ctx, userId, row, plan, open);
			await ctx.db.patch("profiles", profile._id, {
				plan,
				welcomeSeenAt: now,
				// Their last close happened in the old app: no close notice for it here.
				lastSeenClosedCycleId: lastClosed,
			});
		}
		await ctx.db.replace("migrationImports", row._id, {
			email: row.email,
			status: "claimed",
			claimedBy: userId,
			claimedAt: now,
			name: "",
			split: row.split,
			fundCents: 0,
			closed: [],
			goals: [],
			commitments: [],
		});
		return null;
	},
});

/**
 * For emails that already had an account here before the rows were loaded: `onCreate` never ran
 * for them. Run it once after the import; it walks every pending row and calls itself until done.
 */
export const claimExisting = internalMutation({
	args: { cursor: v.optional(v.string()) },
	returns: v.null(),
	handler: async (ctx, { cursor }): Promise<null> => {
		const page = await ctx.db
			.query("migrationImports")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.paginate({ numItems: EXISTING_PAGE, cursor: cursor ?? null });
		for (const row of page.page) {
			const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: "user",
				where: [{ field: "email", value: row.email }],
			});
			if (user) {
				await ctx.scheduler.runAfter(0, internal.migration.claim, {
					userId: user._id,
					email: row.email,
				});
			}
		}
		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.migration.claimExisting, {
				cursor: page.continueCursor,
			});
		}
		return null;
	},
});

/** How the cut is going. Pending rows are the ones loaded minus these two. */
export const status = internalQuery({
	args: {},
	returns: v.object({ claimed: v.number(), conflict: v.number() }),
	handler: async (ctx) => {
		const count = async (value: "claimed" | "conflict") =>
			(
				await ctx.db
					.query("migrationImports")
					.withIndex("by_status", (q) => q.eq("status", value))
					.take(STATUS_CAP)
			).length;
		return { claimed: await count("claimed"), conflict: await count("conflict") };
	},
});
