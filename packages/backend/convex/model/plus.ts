import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

const NEED_PLUS = "Esto requiere Quipu Plus.";

/** Plus for now = trial still open. Subscriptions land later (Polar / RevenueCat). */
export async function requirePlus(ctx: Ctx, userId: string) {
	const profile = await ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();
	if (profile?.trialEndsAt === undefined || profile.trialEndsAt <= Date.now()) {
		throw new ConvexError(NEED_PLUS);
	}
}
