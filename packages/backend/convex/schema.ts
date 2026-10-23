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
		createdAt: v.number(),
	}).index("by_userId", ["userId"]),
});
