import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { closeTotals, spendableAmounts } from "../schema";

const PAGE_SIZE = 25;

export const closedCycle = v.object({
	id: v.id("cycles"),
	startDate: v.string(),
	endDate: v.string(),
	marginCents: v.number(),
	left: spendableAmounts,
	detail: v.union(
		v.object({ kind: v.literal("ok"), ...closeTotals }),
		v.object({
			kind: v.literal("unavailable"),
			reason: v.union(
				v.literal("legacy"),
				v.literal("tooManyMovements"),
				v.literal("inconsistent"),
			),
		}),
	),
});

export type ClosedCycle = Infer<typeof closedCycle>;

function toClosedCycle(cycle: Doc<"cycles">): ClosedCycle {
	const { needsCents, wantsCents } = cycle.envelopes;
	const summary = cycle.closeSummary;
	return {
		id: cycle._id,
		startDate: cycle.startDate,
		endDate: cycle.endDate,
		marginCents: needsCents + wantsCents,
		left: { needsCents, wantsCents },
		detail:
			summary?.status === "ok"
				? {
						kind: "ok",
						assigned: summary.assigned,
						spent: summary.spent,
						fundedCents: summary.fundedCents,
					}
				: { kind: "unavailable", reason: summary?.status ?? "legacy" },
	};
}

/**
 * Walks closed cycles from the newest (or from just before `before`) and keeps the ones with
 * activity. Spends at most `budget` reads, counting cycle documents and every activity check.
 * `next` is where to resume, or null when the whole history was reached. `reads` is what it spent.
 *
 * A cycle with no carry and no movements is idle: hidden, neither adds to a streak nor cuts it.
 * Only a zero margin with zero carry can be idle, so only then is the movement check paid.
 */
export async function scanClosedCycles(
	ctx: QueryCtx,
	spaceId: Id<"spaces">,
	{
		before,
		budget,
		stopAfter,
	}: {
		before?: string;
		budget: number;
		stopAfter: (row: ClosedCycle, rows: ClosedCycle[]) => boolean;
	},
) {
	const rows: ClosedCycle[] = [];
	let hidden = 0;
	let remaining = budget;
	let cursor = before;
	const done = (next: string | null) => ({ rows, hidden, next, reads: budget - remaining });
	while (remaining > 0) {
		const size = Math.min(PAGE_SIZE, remaining);
		const page = await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) =>
				cursor === undefined
					? q.eq("spaceId", spaceId)
					: q.eq("spaceId", spaceId).lt("startDate", cursor),
			)
			.order("desc")
			.take(size);
		remaining -= page.length;
		for (const cycle of page) {
			if (cycle.closedAt === undefined) {
				cursor = cycle.startDate;
				continue;
			}
			const row = toClosedCycle(cycle);
			const mayBeIdle =
				row.marginCents === 0 && cycle.carryIn.needsCents === 0 && cycle.carryIn.wantsCents === 0;
			if (mayBeIdle) {
				// Not enough budget to tell: stop before this cycle so the next page re-examines it.
				if (remaining <= 0) return done(cursor ?? null);
				remaining -= 1;
				const movement = await ctx.db
					.query("transactions")
					.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
					.first();
				if (movement === null) {
					hidden += 1;
					cursor = cycle.startDate;
					continue;
				}
			}
			rows.push(row);
			cursor = cycle.startDate;
			if (stopAfter(row, rows)) return done(cursor);
		}
		if (page.length < size) return done(null);
	}
	return done(cursor ?? null);
}
