import { ConvexError, v } from "convex/values";
import { reallocateFree, ZERO_AMOUNTS } from "../shared/budget";
import { isSamePlan, isValidPlan, isValidSplit } from "../shared/plan";
import { mutation } from "./_generated/server";
import { getReserved } from "./model/budget";
import { requireOpenCycle } from "./model/cycles";
import { BAD_INPUT } from "./model/input";
import { requireUser } from "./model/spaces";
import { plan, spaceKind, split } from "./schema";

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
		// Only a pending change: `plan` and the open cycle stay as they are until the next cycle starts.
		await ctx.db.patch("profiles", profile._id, {
			nextPlan: isSamePlan(profile.plan, planValue) ? undefined : planValue,
		});
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
		const { space, cycle, today } = await requireOpenCycle(ctx, kind);
		if (!isValidSplit(splitValue)) throw new ConvexError(BAD_INPUT);
		// Spent money already left the envelopes; money held for commitments still due stays where it is.
		const reserved = await getReserved(ctx, space._id, cycle.endDate, today);
		const envelopes = reallocateFree(cycle.envelopes, ZERO_AMOUNTS, reserved, splitValue);
		await ctx.db.patch("cycles", cycle._id, { split: splitValue, envelopes });
		return null;
	},
});
