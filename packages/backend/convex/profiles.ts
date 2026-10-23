import type { GenericCtx } from "@convex-dev/better-auth";
import { ConvexError, v } from "convex/values";
import { payday, salaryInCents } from "../shared/validation";
import { authComponent } from "./auth";
import type { DataModel } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

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
	draftSalaryCents: v.optional(v.number()),
	draftPayday: v.optional(v.number()),
	createdAt: v.number(),
});

// Names match @convex-dev/require-access-control. getAuthUser does not.
async function ensureUser(ctx: GenericCtx<DataModel>) {
	return await authComponent.safeGetAuthUser(ctx);
}

async function requireUser(ctx: GenericCtx<DataModel>) {
	return await authComponent.getAuthUser(ctx);
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

export const saveOnboardingSteps = mutation({
	args: {
		step,
		draftSalaryCents: v.optional(v.number()),
		draftPayday: v.optional(v.number()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const row = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.unique();
		if (!row) throw new ConvexError("No profile");
		if (
			(args.draftSalaryCents !== undefined &&
				!salaryInCents.safeParse(args.draftSalaryCents).success) ||
			(args.draftPayday !== undefined && !payday.safeParse(args.draftPayday).success)
		) {
			throw new ConvexError("Those values are invalid.");
		}
		await ctx.db.patch("profiles", row._id, {
			currentStep: args.step,
			...(args.draftSalaryCents !== undefined ? { draftSalaryCents: args.draftSalaryCents } : {}),
			...(args.draftPayday !== undefined ? { draftPayday: args.draftPayday } : {}),
		});
		return null;
	},
});
