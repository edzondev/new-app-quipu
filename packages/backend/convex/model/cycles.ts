import { ConvexError } from "convex/values";
import { ZERO_AMOUNTS } from "../../shared/budget";
import { addDays, getCycleRange, getFirstCycleRange, getLimaDate } from "../../shared/dates";
import type { Plan, Split } from "../../shared/plan";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requirePlan, requireSpace, type SpaceKind } from "./spaces";

type Ctx = QueryCtx | MutationCtx;

const ZERO_CARRY = { needsCents: 0, wantsCents: 0 };

export function createFirstCycle(
	ctx: MutationCtx,
	spaceId: Id<"spaces">,
	plan: Pick<Plan, "cadence" | "cycleStartDay">,
	split: Split,
	today: string,
) {
	const range = getFirstCycleRange(plan.cadence, plan.cycleStartDay, today);
	return ctx.db.insert("cycles", {
		spaceId,
		...range,
		split,
		envelopes: ZERO_AMOUNTS,
		carryIn: ZERO_CARRY,
	});
}

/** Latest cycle that started on or before `date`. It can be over if close hasn't run yet. */
export function getCycleAt(ctx: Ctx, spaceId: Id<"spaces">, date: string) {
	return ctx.db
		.query("cycles")
		.withIndex("by_space_start", (q) => q.eq("spaceId", spaceId).lte("startDate", date))
		.order("desc")
		.first();
}

export function getCycleStarting(ctx: Ctx, spaceId: Id<"spaces">, startDate: string) {
	return ctx.db
		.query("cycles")
		.withIndex("by_space_start", (q) => q.eq("spaceId", spaceId).eq("startDate", startDate))
		.unique();
}

export async function requireCycleAt(ctx: Ctx, spaceId: Id<"spaces">, date: string) {
	const cycle = await getCycleAt(ctx, spaceId, date);
	if (!cycle) throw new ConvexError("No encontramos tu ciclo.");
	return cycle;
}

/** Space you can access plus its open cycle for today. Shared by every read of the live budget. */
export async function requireOpenCycle(ctx: Ctx, kind: SpaceKind) {
	const { userId, space } = await requireSpace(ctx, kind);
	const today = getLimaDate();
	const cycle = await requireCycleAt(ctx, space._id, today);
	if (cycle.endDate < today) {
		throw new ConvexError("No encontramos tu ciclo abierto.");
	}
	return { userId, space, cycle, today };
}

/** Next cycle uses the plan as it is now: cadence or start-day changes apply here. */
export async function getOrCreateNextCycle(
	ctx: MutationCtx,
	space: Doc<"spaces">,
	cycle: Doc<"cycles">,
) {
	const startDate = addDays(cycle.endDate, 1);
	const existing = await getCycleStarting(ctx, space._id, startDate);
	if (existing) return existing;

	const plan = await requirePlan(ctx, space);
	const { endDate } = getCycleRange(plan.cadence, plan.cycleStartDay, startDate);
	const id = await ctx.db.insert("cycles", {
		spaceId: space._id,
		startDate,
		endDate,
		split: cycle.split,
		envelopes: ZERO_AMOUNTS,
		carryIn: ZERO_CARRY,
	});
	const next = await ctx.db.get("cycles", id);
	if (!next) throw new Error("Cycle insert failed");
	return next;
}

/**
 * Closes `cycle` and returns the next one. Idempotent if `closedAt` is already set.
 *
 * TODO: when expenses exist, carryIn / savings must use freeAmounts(envelopes, spent,
 * reserved) — the free pool — not the full envelopes.
 */
export async function closeCycle(
	ctx: MutationCtx,
	space: Doc<"spaces">,
	cycle: Doc<"cycles">,
	userId: string,
) {
	if (cycle.closedAt !== undefined) {
		const next = await getCycleStarting(ctx, space._id, addDays(cycle.endDate, 1));
		if (!next) throw new ConvexError("No encontramos tu ciclo.");
		return next;
	}

	const next = await getOrCreateNextCycle(ctx, space, cycle);
	const carryIn = {
		needsCents: cycle.envelopes.needsCents,
		wantsCents: cycle.envelopes.wantsCents,
	};
	const savingsCents = cycle.envelopes.savingsCents;

	if (savingsCents > 0) {
		await ctx.db.insert("transactions", {
			kind: "saving",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents: savingsCents,
			date: cycle.endDate,
		});
	}

	await ctx.db.patch("cycles", next._id, {
		carryIn,
		envelopes: {
			needsCents: carryIn.needsCents,
			wantsCents: carryIn.wantsCents,
			savingsCents: 0,
		},
	});
	await ctx.db.patch("cycles", cycle._id, { closedAt: Date.now() });
	const closedNext = await ctx.db.get("cycles", next._id);
	if (!closedNext) throw new ConvexError("No encontramos tu ciclo.");
	return closedNext;
}

const MAX_ENSURE_OPENS = 120;

/** Create the next cycle(s) if the previous one already ended. Safe to call on every app open. */
export async function ensureOpenCycle(
	ctx: MutationCtx,
	space: Doc<"spaces">,
	today: string,
	userId: string,
) {
	let cycle = await requireCycleAt(ctx, space._id, today);
	for (let i = 0; cycle.endDate < today; i++) {
		if (i >= MAX_ENSURE_OPENS) {
			throw new ConvexError("No pudimos poner al día tus ciclos. Inténtalo otra vez.");
		}
		cycle = await closeCycle(ctx, space, cycle, userId);
	}
	return cycle;
}
