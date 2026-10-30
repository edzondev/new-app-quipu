import { ConvexError, v } from "convex/values";
import { isIsoDate } from "../shared/dates";
import { query } from "./_generated/server";
import { getDayBudget } from "./model/budget";
import { requireOpenCycle } from "./model/cycles";
import { requirePlan } from "./model/spaces";
import { spaceKind } from "./schema";

const BAD_INPUT = "Revisa los datos e inténtalo otra vez.";

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
		const { needsCents, wantsCents, savingsCents, dailyCents } = await getDayBudget(
			ctx,
			space._id,
			cycle,
			today,
		);
		return { needsCents, wantsCents, savingsCents, dailyCents };
	},
});

/** Inicio. `today` is the Lima date the web shows, so the number rolls over without a reload. */
export const getHome = query({
	args: { space: spaceKind, today: v.string() },
	returns: v.object({
		needsCents: v.number(),
		wantsCents: v.number(),
		savingsCents: v.number(),
		dailyCents: v.number(),
		daysLeft: v.number(),
		pendingCents: v.number(),
		planIncomeCents: v.number(),
		empty: v.boolean(),
		dueSoon: v.array(
			v.object({
				id: v.id("commitments"),
				name: v.string(),
				amountCents: v.number(),
				dueDate: v.string(),
			}),
		),
	}),
	handler: async (ctx, { space: kind, today }) => {
		if (!isIsoDate(today)) throw new ConvexError(BAD_INPUT);
		const { space, cycle } = await requireOpenCycle(ctx, kind, today);
		const plan = await requirePlan(ctx, space);
		const budget = await getDayBudget(ctx, space._id, cycle, today);
		return {
			...budget,
			planIncomeCents: plan.incomeCents,
			empty: budget.needsCents + budget.wantsCents + budget.savingsCents === 0,
		};
	},
});
