import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	profiles: defineTable({
		userId: v.string(),
		name: v.string(),
		currentStep: v.union(
			v.literal("step-1"),
			v.literal("step-2"),
			v.literal("step-3"),
			v.literal("done"),
		),
		draftSalaryCents: v.optional(v.number()),
		draftPayday: v.optional(v.number()),
		createdAt: v.number(),
	}).index("by_userId", ["userId"]),
});
