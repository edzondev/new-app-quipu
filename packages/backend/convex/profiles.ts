import type { GenericCtx } from "@convex-dev/better-auth";
import { v } from "convex/values";
import { authComponent } from "./auth";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

const step = v.union(
	v.literal("step-1"),
	v.literal("step-2"),
	v.literal("step-3"),
	v.literal("done"),
);

const profile = v.object({
	userId: v.string(),
	name: v.string(),
	currentStep: step,
	createdAt: v.number(),
});

// Names match @convex-dev/require-access-control. getAuthUser does not.
async function ensureUser(ctx: GenericCtx<DataModel>) {
	return await authComponent.safeGetAuthUser(ctx);
}

export const myProfile = query({
	args: {},
	returns: v.union(profile, v.null()),
	handler: async (ctx) => {
		const user = await ensureUser(ctx);
		if (!user) return null;
		const row = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.unique();
		if (!row) return null;
		const { _id, _creationTime, ...fields } = row;
		return fields;
	},
});
