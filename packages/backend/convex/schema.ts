import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const plan = v.object({
	cadence: v.union(v.literal("monthly"), v.literal("biweekly"), v.literal("weekly")),
	cycleStartDay: v.union(v.number(), v.literal("last")),
	incomeCents: v.number(),
	split: v.object({
		needs: v.number(),
		wants: v.number(),
		savings: v.number(),
	}),
});

export default defineSchema({
	profiles: defineTable({
		userId: v.string(),
		name: v.string(),
		createdAt: v.number(),
		plan: v.optional(plan),
	}).index("by_userId", ["userId"]),
});
