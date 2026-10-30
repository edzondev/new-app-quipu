import { ConvexError, v } from "convex/values";
import { applyIncome, isValidCents, ZERO_AMOUNTS } from "../shared/budget";
import { getLimaDate } from "../shared/dates";
import { isValidPlan, isValidSplit } from "../shared/plan";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { authComponent } from "./auth";
import { createFirstCycle } from "./model/cycles";
import { getPersonalSpace, requireUser } from "./model/spaces";
import { plan, split } from "./schema";

function getProfile(ctx: QueryCtx, userId: string) {
	return ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();
}

// Named for @convex-dev/require-access-control on public queries.
function checkAccess(ctx: QueryCtx) {
	return authComponent.safeGetAuthUser(ctx);
}

export const myProfile = query({
	args: {},
	returns: v.union(v.null(), v.object({ name: v.string(), plan: v.union(plan, v.null()) })),
	handler: async (ctx) => {
		const user = await checkAccess(ctx);
		if (!user) return null;
		const profile = await getProfile(ctx, user._id);
		if (!profile) return null;
		return { name: user.name, plan: profile.plan ?? null };
	},
});

export const completeOnboarding = mutation({
	args: {
		...plan.fields,
		todayCents: v.number(),
		split,
	},
	returns: v.null(),
	handler: async (ctx, { split: splitValue, todayCents, ...planValue }) => {
		const user = await requireUser(ctx);
		const profile = await getProfile(ctx, user._id);
		if (!profile) throw new ConvexError("No encontramos tu perfil.");

		if (!isValidPlan(planValue) || !isValidCents(todayCents) || !isValidSplit(splitValue)) {
			throw new ConvexError("Revisa los datos e inténtalo otra vez.");
		}

		// First onboarding wins. Later changes go through Ajustes, so a second call
		// must not rewrite the plan while leaving the first cycle untouched.
		if (await getPersonalSpace(ctx, user._id)) return null;

		const today = getLimaDate();
		await ctx.db.patch("profiles", profile._id, { plan: planValue });
		const spaceId = await ctx.db.insert("spaces", { kind: "personal", ownerId: user._id });
		const cycleId = await createFirstCycle(ctx, spaceId, planValue, splitValue, today);
		const { envelopes, allocation } = applyIncome(ZERO_AMOUNTS, todayCents, splitValue);
		await ctx.db.patch("cycles", cycleId, { envelopes });
		await ctx.db.insert("transactions", {
			kind: "income",
			spaceId,
			cycleId,
			userId: user._id,
			amountCents: todayCents,
			date: today,
			allocation,
		});
		return null;
	},
});
