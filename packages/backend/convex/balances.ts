import { v } from "convex/values";
import { addDays, isEarlyIncomeWindow, isoDateSchema } from "../shared/dates";
import { query } from "./_generated/server";
import { getDayBudget } from "./model/budget";
import { requireOpenCycle } from "./model/cycles";
import { parseInput } from "./model/input";
import { requirePlan } from "./model/spaces";
import { amounts, spaceKind, split } from "./schema";

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
		startDate: v.string(),
		endDate: v.string(),
		needsCents: v.number(),
		wantsCents: v.number(),
		savingsCents: v.number(),
		assigned: amounts,
		split,
		reserved: amounts,
		dailyCents: v.number(),
		daysLeft: v.number(),
		pendingCents: v.number(),
		planIncomeCents: v.number(),
		empty: v.boolean(),
		earlyWindow: v.boolean(),
		earlyIncome: v.union(v.object({ amountCents: v.number(), startsOn: v.string() }), v.null()),
	}),
	handler: async (ctx, { space: kind, today }) => {
		parseInput(isoDateSchema, today);
		const { space, cycle } = await requireOpenCycle(ctx, kind, today);
		const plan = await requirePlan(ctx, space);
		const { hasIncome, earlyCents, ...budget } = await getDayBudget(ctx, space._id, cycle, today);
		const { needsCents, wantsCents } = cycle.carryIn;
		return {
			...budget,
			split: cycle.split,
			startDate: cycle.startDate,
			endDate: cycle.endDate,
			planIncomeCents: plan.incomeCents,
			earlyWindow: isEarlyIncomeWindow(plan.cadence, today, cycle.endDate),
			earlyIncome:
				earlyCents > 0 ? { amountCents: earlyCents, startsOn: addDays(cycle.endDate, 1) } : null,
			// Envelopes at 0 can still mean money moved (spent, saved); empty is no income and no carry.
			empty: !hasIncome && needsCents + wantsCents === 0,
		};
	},
});
