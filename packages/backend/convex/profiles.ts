import { ConvexError, v } from "convex/values";
import { isValidPlan } from "../shared/plan";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { authComponent } from "./auth";
import { plan } from "./schema";

function getProfile(ctx: QueryCtx, userId: string) {
	return ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();
}

function checkAuthUser(ctx: QueryCtx) {
	return authComponent.safeGetAuthUser(ctx);
}

function requireUser(ctx: MutationCtx) {
	return authComponent.getAuthUser(ctx);
}

export const myProfile = query({
	args: {},
	returns: v.union(v.null(), v.object({ name: v.string(), plan: v.union(plan, v.null()) })),
	handler: async (ctx) => {
		const user = await checkAuthUser(ctx);
		if (!user) return null;
		const profile = await getProfile(ctx, user._id);
		if (!profile) return null;
		return { name: user.name, plan: profile.plan ?? null };
	},
});

export const completeOnboarding = mutation({
	args: plan.fields,
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const profile = await getProfile(ctx, user._id);
		if (!profile) throw new ConvexError("No encontramos tu perfil.");
		if (!isValidPlan(args)) throw new ConvexError("Revisa los datos e inténtalo otra vez.");
		await ctx.db.patch("profiles", profile._id, { plan: args });
		return null;
	},
});
