import { v } from "convex/values";
import { getPreview } from "../shared/preview";
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

		const [transactions, commitmentRows] = await Promise.all([
			ctx.db
				.query("transactions")
				.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
				.take(200),
			ctx.db
				.query("commitments")
				.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
				.take(100),
		]);

		const incomeCents = transactions
			.filter((row) => row.kind === "income")
			.reduce((sum, row) => sum + row.amountCents, 0);
		const commitments = commitmentRows.flatMap((row) =>
			row.frequency === "monthly" ? [{ amountCents: row.amountCents, dueDay: row.dueDay }] : [],
		);

		return getPreview({
			incomeCents,
			commitments,
			split: cycle.split,
			cycleEnd: cycle.endDate,
			today,
		});
	},
});
