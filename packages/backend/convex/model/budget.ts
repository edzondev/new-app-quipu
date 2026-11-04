import { getDailyCents } from "../../shared/budget";
import { isReserved } from "../../shared/commitments";
import { daysBetween } from "../../shared/dates";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getCommitmentOccurrences } from "./commitments";

const DUE_SOON_COUNT = 3;

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
	const hasIncome = cycleTx.some((tx) => tx.kind === "income");
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
	const pendingCents = reserved.reduce(
		(sum, { row, dueDates }) => sum + row.amountCents * dueDates.length,
		0,
	);
	const dueSoon = reserved
		.flatMap(({ row, dueDates: [dueDate] }) =>
			dueDate === undefined
				? []
				: [{ id: row._id, name: row.name, amountCents: row.amountCents, dueDate }],
		)
		.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
		.slice(0, DUE_SOON_COUNT);

	return {
		needsCents,
		wantsCents,
		savingsCents,
		dailyCents: getDailyCents(needsCents + wantsCents - pendingCents, daysLeft),
		daysLeft,
		pendingCents,
		hasIncome,
		dueSoon,
	};
}
