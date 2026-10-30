import { getDailyCents } from "../../shared/budget";
import { getMonthlyDueDates, getPendingCents } from "../../shared/commitments";
import { addDays, daysBetween } from "../../shared/dates";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

const DUE_SOON_DAYS = 3;

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
	const paidIds = new Set(
		cycleTx.flatMap((tx) =>
			tx.kind === "expense" && tx.commitmentId !== undefined ? [tx.commitmentId] : [],
		),
	);
	const pending = commitmentRows.flatMap((row) =>
		row.frequency === "monthly" && !paidIds.has(row._id)
			? [{ id: row._id, name: row.name, amountCents: row.amountCents, dueDay: row.dueDay }]
			: [],
	);

	const daysLeft = Math.max(0, daysBetween(today, cycle.endDate) + 1);
	const pendingCents = getPendingCents(pending, today, cycle.endDate);
	const horizon = addDays(today, DUE_SOON_DAYS);
	const dueSoon = pending
		.flatMap(({ dueDay, ...item }) => {
			const [dueDate] = getMonthlyDueDates(dueDay, today, cycle.endDate);
			return dueDate !== undefined && dueDate <= horizon ? [{ ...item, dueDate }] : [];
		})
		.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

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
