import { v } from "convex/values";
import { getDailyCents } from "../shared/budget";
import { getPendingCents } from "../shared/commitments";
import { daysBetween } from "../shared/dates";
import { query } from "./_generated/server";
import { requireOpenCycle } from "./model/cycles";
import { spaceKind } from "./schema";

export const getBalances = query({
	args: { space: spaceKind },
	returns: v.object({
		needsCents: v.number(),
		wantsCents: v.number(),
		savingsCents: v.number(),
		dailyCents: v.number(),
	}),
	handler: async (ctx, { space: kind }) => {
		const { space, cycle, today } = await requireOpenCycle(ctx, kind);
		const { needsCents, wantsCents, savingsCents } = cycle.envelopes;

		const [commitmentRows, cycleTx] = await Promise.all([
			ctx.db
				.query("commitments")
				.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
				.take(100),
			ctx.db
				.query("transactions")
				.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
				.take(500),
		]);
		const paidIds = new Set(
			cycleTx.flatMap((tx) =>
				tx.kind === "expense" && tx.commitmentId !== undefined ? [tx.commitmentId] : [],
			),
		);
		const commitments = commitmentRows.flatMap((row) =>
			row.frequency === "monthly" && !paidIds.has(row._id)
				? [{ amountCents: row.amountCents, dueDay: row.dueDay }]
				: [],
		);

		const daysLeft = Math.max(0, daysBetween(today, cycle.endDate) + 1);
		const pendingCents = getPendingCents(commitments, today, cycle.endDate);
		return {
			needsCents,
			wantsCents,
			savingsCents,
			dailyCents: getDailyCents(needsCents + wantsCents - pendingCents, daysLeft),
		};
	},
});
