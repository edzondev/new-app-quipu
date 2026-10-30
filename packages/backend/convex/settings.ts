import { ConvexError, v } from "convex/values";
import { reallocateFree, ZERO_AMOUNTS } from "../shared/budget";
import { isValidPlan, isValidSplit } from "../shared/plan";
import { mutation } from "./_generated/server";
import { requireOpenCycle } from "./model/cycles";
import { requireUser } from "./model/spaces";
import { plan, spaceKind, split } from "./schema";

const BAD_INPUT = "Revisa los datos e inténtalo otra vez.";
const NO_PROFILE = "No encontramos tu perfil.";
const NO_PLAN = "Termina tus primeros pasos.";

export const updatePlan = mutation({
	args: plan.fields,
	returns: v.null(),
	handler: async (ctx, planValue) => {
		const user = await requireUser(ctx);
		if (!isValidPlan(planValue)) throw new ConvexError(BAD_INPUT);
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.unique();
		if (!profile) throw new ConvexError(NO_PROFILE);
		if (!profile.plan) throw new ConvexError(NO_PLAN);
		await ctx.db.patch("profiles", profile._id, { plan: planValue });
		return null;
	},
});

export const updateSplit = mutation({
	args: {
		space: spaceKind,
		split,
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, split: splitValue }) => {
		const { cycle } = await requireOpenCycle(ctx, kind);
		if (!isValidSplit(splitValue)) throw new ConvexError(BAD_INPUT);
		const envelopes = reallocateFree(cycle.envelopes, ZERO_AMOUNTS, ZERO_AMOUNTS, splitValue);
		await ctx.db.patch("cycles", cycle._id, { split: splitValue, envelopes });
		return null;
	},
});
