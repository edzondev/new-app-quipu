import { v } from "convex/values";
import { isoDateSchema } from "../shared/dates";
import { query } from "./_generated/server";
import { parseInput } from "./model/input";
import { closedCycle, scanClosedCycles } from "./model/progress";
import { requireSpace } from "./model/spaces";
import { spaceKind } from "./schema";

const PAGE_ROWS = 12;
const PAGE_BUDGET = 200;
const STREAK_BUDGET = 500;

/** One page of the history of closed cycles with activity, newest first. Follow `next` for more. */
export const list = query({
	args: { space: spaceKind, before: v.optional(v.string()) },
	returns: v.object({
		cycles: v.array(closedCycle),
		hidden: v.number(),
		next: v.union(v.string(), v.null()),
	}),
	handler: async (ctx, { space: kind, before }) => {
		const { space } = await requireSpace(ctx, kind);
		if (before !== undefined) parseInput(isoDateSchema, before);
		const { rows, hidden, next, reads } = await scanClosedCycles(ctx, space._id, {
			before,
			budget: PAGE_BUDGET,
			stopAfter: (_, found) => found.length >= PAGE_ROWS,
		});
		// A full page may have used the last cycle to show: look for one more with what is left of
		// the same budget, so "more" never leads to an empty page. Out of budget, assume there is.
		let hasMore = next !== null;
		if (hasMore && rows.length >= PAGE_ROWS) {
			const ahead = await scanClosedCycles(ctx, space._id, {
				before: next ?? undefined,
				budget: PAGE_BUDGET - reads,
				stopAfter: () => true,
			});
			hasMore = ahead.rows.length > 0 || ahead.next !== null;
		}
		return { cycles: rows, hidden, next: hasMore ? next : null };
	},
});

/** Cycles in a row without running out of margin, from the latest. `exact` is false if the read budget ran out first. */
export const streak = query({
	args: { space: spaceKind },
	returns: v.object({ streak: v.number(), exact: v.boolean(), hasActive: v.boolean() }),
	handler: async (ctx, { space: kind }) => {
		const { space } = await requireSpace(ctx, kind);
		const { rows, next } = await scanClosedCycles(ctx, space._id, {
			budget: STREAK_BUDGET,
			stopAfter: (row) => row.marginCents < 0,
		});
		const cut = rows.findIndex((row) => row.marginCents < 0);
		return {
			streak: cut === -1 ? rows.length : cut,
			exact: cut !== -1 || next === null,
			hasActive: rows.length > 0,
		};
	},
});
