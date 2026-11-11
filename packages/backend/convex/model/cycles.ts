import { ConvexError } from "convex/values";
import { addAmounts, ZERO_AMOUNTS } from "../../shared/budget";
import { addDays, getFirstCycleRange, getLimaDate, getNextCycleRange } from "../../shared/dates";
import type { Plan, Split } from "../../shared/plan";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { type CloseSummary, summarizeClose } from "./closeSummary";
import { requireWritable } from "./plus";
import { requireOwnerProfile, requirePlan, requireSpace, type SpaceKind } from "./spaces";

type Ctx = QueryCtx | MutationCtx;

const ZERO_CARRY = { needsCents: 0, wantsCents: 0 };
const MAX_SUMMARY_ROWS = 500;

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
export async function requireOpenCycle(ctx: Ctx, kind: SpaceKind, today = getLimaDate()) {
	const { userId, space } = await requireSpace(ctx, kind);
	const cycle = await requireCycleAt(ctx, space._id, today);
	if (cycle.endDate < today) {
		throw new ConvexError("No encontramos tu ciclo abierto.");
	}
	return { userId, space, cycle, today };
}

/**
 * The next cycle is where a pending plan change takes effect. In the personal space the pending
 * plan (`nextPlan`) becomes `plan` here; a household uses its own cycle (`cadence` and
 * `cycleStartDay` on the space) and never reads the owner's profile.
 */
export async function getOrCreateNextCycle(
	ctx: MutationCtx,
	space: Doc<"spaces">,
	cycle: Doc<"cycles">,
) {
	const startDate = addDays(cycle.endDate, 1);
	const existing = await getCycleStarting(ctx, space._id, startDate);
	if (existing) return existing;

	const profile =
		space.kind === "personal" ? (await requireOwnerProfile(ctx, space)).profile : undefined;
	const pending = profile?.nextPlan;
	const applied = pending ?? (await requirePlan(ctx, space));
	const { endDate } = getNextCycleRange(applied.cadence, applied.cycleStartDay, startDate);
	if (profile && pending)
		await ctx.db.patch("profiles", profile._id, {
			plan: pending,
			nextPlan: undefined,
		});
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

async function moveEarlyIncomes(ctx: MutationCtx, fromId: Id<"cycles">, toId: Id<"cycles">) {
	const nextEarly = () =>
		ctx.db
			.query("transactions")
			.withIndex("by_forNextCycle_cycleId", (q) => q.eq("forNextCycle", true).eq("cycleId", fromId))
			.first();
	let moved = ZERO_AMOUNTS;
	for (let row = await nextEarly(); row?.kind === "income"; row = await nextEarly()) {
		moved = addAmounts(moved, row.allocation);
		await ctx.db.patch("transactions", row._id, {
			cycleId: toId,
			forNextCycle: undefined,
		});
	}
	return moved;
}

/** Closes `cycle` and returns the next one. Idempotent if `closedAt` is already set. */
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
	// A household does not carry Necesidades and Gustos: their net goes to Ahorro, and a deficit is not carried.
	const isHousehold = space.kind === "household";
	const carryIn = isHousehold
		? ZERO_CARRY
		: { needsCents: cycle.envelopes.needsCents, wantsCents: cycle.envelopes.wantsCents };
	const sweptCents = isHousehold
		? Math.max(0, cycle.envelopes.needsCents + cycle.envelopes.wantsCents)
		: 0;
	const savingsCents = cycle.envelopes.savingsCents;

	await ctx.db.patch("cycles", next._id, {
		carryIn,
		envelopes: addAmounts(
			{ ...carryIn, savingsCents: sweptCents },
			await moveEarlyIncomes(ctx, cycle._id, next._id),
		),
	});
	// Read after the early incomes moved out, so they are not counted in the cycle that closes, and
	// before the automatic saving below, so it does not take a place among the person's movements.
	const rows = await ctx.db
		.query("transactions")
		.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
		.take(MAX_SUMMARY_ROWS + 1);
	const summary: CloseSummary =
		rows.length > MAX_SUMMARY_ROWS
			? { status: "tooManyMovements" }
			: summarizeClose(cycle, rows, Math.max(0, savingsCents));

	if (savingsCents > 0) {
		await ctx.db.insert("transactions", {
			kind: "saving",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents: savingsCents,
			date: cycle.endDate,
		});
		// Re-read: ensureOpen may close several cycles in one call with a stale space doc.
		const fresh = await ctx.db.get("spaces", space._id);
		if (!fresh) throw new ConvexError("No encontramos este dato.");
		await ctx.db.patch("spaces", space._id, {
			fundCents: fresh.fundCents + savingsCents,
		});
	}

	await ctx.db.patch("cycles", cycle._id, {
		closedAt: Date.now(),
		closeSummary: summary,
	});
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

/** The profile field where each person remembers the last close notice they dismissed, per kind of space. */
export function lastSeenOf(profile: Doc<"profiles">, kind: SpaceKind) {
	return kind === "household"
		? profile.lastSeenHouseholdClosedCycleId
		: profile.lastSeenClosedCycleId;
}

export function seenPatch(kind: SpaceKind, cycleId: Id<"cycles">) {
	return kind === "household"
		? { lastSeenHouseholdClosedCycleId: cycleId }
		: { lastSeenClosedCycleId: cycleId };
}

/** Latest closed cycle of a space, if any. */
export async function getLatestClosed(ctx: Ctx, spaceId: Id<"spaces">) {
	const closed = await ctx.db
		.query("cycles")
		.withIndex("by_space_closedAt", (q) => q.eq("spaceId", spaceId))
		.order("desc")
		.take(20);
	return closed.find((cycle) => cycle.closedAt !== undefined) ?? null;
}

/** `requireOpenCycle` for a write: a household without Plus is read-only. */
export async function requireWritableOpenCycle(ctx: Ctx, kind: SpaceKind, today = getLimaDate()) {
	const open = await requireOpenCycle(ctx, kind, today);
	await requireWritable(ctx, open.space);
	return open;
}
