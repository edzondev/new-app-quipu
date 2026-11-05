import { addAmounts, getDailyCents } from "../../shared/budget";
import { isReserved } from "../../shared/commitments";
import { daysBetween } from "../../shared/dates";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getCommitmentOccurrences } from "./commitments";

/** The day's number and what feeds it. Shared by every read of the live budget. */
export async function getDayBudget(
	ctx: QueryCtx,
	spaceId: Doc<"spaces">["_id"],
	cycle: Doc<"cycles">,
	today: string,
) {
	const { needsCents, wantsCents, savingsCents } = cycle.envelopes;

	const [commitmentRows, cycleTx] = await Promise.all([
		ctx.db
			.query("commitments")
			.withIndex("by_spaceId", (q) => q.eq("spaceId", spaceId))
			.take(100),
		ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.take(500),
	]);
	const hasIncome = cycleTx.some((tx) => tx.kind === "income" && !tx.forNextCycle);
	const reserved = await Promise.all(
		commitmentRows.map(async (row) => {
			const occurrences = await getCommitmentOccurrences(ctx, row, today, cycle.endDate);
			return {
				row,
				dueDates: occurrences.filter((o) => isReserved(o.status)).map((o) => o.dueDate),
			};
		}),
	);

	const daysLeft = Math.max(0, daysBetween(today, cycle.endDate) + 1);
	// A negative carry is debt the cycle absorbs, not money assigned to it.
	const carried = {
		needsCents: Math.max(0, cycle.carryIn.needsCents),
		wantsCents: Math.max(0, cycle.carryIn.wantsCents),
		savingsCents: 0,
	};
	const assigned = cycleTx.reduce(
		(sum, tx) => (tx.kind === "income" && !tx.forNextCycle ? addAmounts(sum, tx.allocation) : sum),
		carried,
	);
	const pendingCents = reserved.reduce(
		(sum, { row, dueDates }) => sum + row.amountCents * dueDates.length,
		0,
	);

	return {
		needsCents,
		wantsCents,
		savingsCents,
		assigned,
		dailyCents: getDailyCents(needsCents + wantsCents - pendingCents, daysLeft),
		daysLeft,
		pendingCents,
		hasIncome,
	};
}
