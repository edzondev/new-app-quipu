import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const plan = v.object({
	cadence: v.union(v.literal("monthly"), v.literal("biweekly"), v.literal("weekly")),
	cycleStartDay: v.union(v.number(), v.literal("last")),
	incomeCents: v.number(),
});

export const split = v.object({
	needs: v.number(),
	wants: v.number(),
	savings: v.number(),
});

export const amounts = v.object({
	needsCents: v.number(),
	wantsCents: v.number(),
	savingsCents: v.number(),
});

export const envelope = v.union(v.literal("needs"), v.literal("wants"), v.literal("savings"));
export const spendable = v.union(v.literal("needs"), v.literal("wants"));
export const spaceKind = v.union(v.literal("personal"), v.literal("household"));

export const extraType = v.union(
	v.literal("gratification"),
	v.literal("bonus"),
	v.literal("repayment"),
	v.literal("other"),
);

export const withdrawalReason = v.union(
	v.literal("emergency"),
	v.literal("unexpected"),
	v.literal("mistake"),
	v.literal("other"),
);

const movement = {
	spaceId: v.id("spaces"),
	cycleId: v.id("cycles"),
	userId: v.string(), // who recorded it; in household only that person can edit or delete
	amountCents: v.number(),
	date: v.string(),
	note: v.optional(v.string()),
};

const commitmentBase = {
	spaceId: v.id("spaces"),
	name: v.string(),
	amountCents: v.number(),
	envelope: spendable,
};

export default defineSchema({
	profiles: defineTable({
		userId: v.string(),
		plan: v.optional(plan),
		lastSeenClosedCycleId: v.optional(v.id("cycles")),
		// Quipu Plus trial end (ms). Set by us on the server for 14 days, no card.
		// Polar (web) and RevenueCat (mobile) only charge.
		trialEndsAt: v.optional(v.number()),
	}).index("by_userId", ["userId"]),

	spaces: defineTable({
		kind: spaceKind,
		ownerId: v.string(),
		name: v.optional(v.string()),
		cadence: v.optional(plan.fields.cadence),
		cycleStartDay: v.optional(plan.fields.cycleStartDay),
		inviteCode: v.optional(v.string()),
		inviteExpiresAt: v.optional(v.number()),
		fundGoalCents: v.optional(v.number()),
	})
		.index("by_ownerId_kind", ["ownerId", "kind"])
		.index("by_inviteCode", ["inviteCode"]),

	spaceMembers: defineTable({
		spaceId: v.id("spaces"),
		userId: v.string(),
	})
		.index("by_userId", ["userId"])
		.index("by_spaceId", ["spaceId"]),

	cycles: defineTable({
		spaceId: v.id("spaces"),
		startDate: v.string(),
		endDate: v.string(),
		closedAt: v.optional(v.number()),
		split,
		envelopes: amounts,
		carryIn: v.object({
			needsCents: v.number(),
			wantsCents: v.number(),
		}),
	})
		.index("by_space_closedAt", ["spaceId", "closedAt"])
		.index("by_space_start", ["spaceId", "startDate"]),

	transactions: defineTable(
		v.union(
			v.object({
				...movement,
				kind: v.literal("expense"),
				envelope: spendable,
				commitmentId: v.optional(v.id("commitments")),
			}),
			v.object({
				...movement,
				kind: v.literal("income"),
				extraType: v.optional(extraType),
				allocation: amounts,
			}),
			v.object({
				...movement,
				kind: v.literal("contribution"),
				envelope: spendable,
				toCycleId: v.id("cycles"),
				toEnvelope: envelope,
			}),
			v.object({
				...movement,
				kind: v.literal("saving"),
				goalId: v.optional(v.id("goals")),
			}),
			v.object({
				...movement,
				kind: v.literal("withdrawal"),
				reason: withdrawalReason,
			}),
		),
	)
		.index("by_cycleId", ["cycleId"])
		.index("by_toCycleId", ["toCycleId"])
		.index("by_spaceId_kind", ["spaceId", "kind"])
		.index("by_commitmentId", ["commitmentId"]),

	commitments: defineTable(
		v.union(
			v.object({
				...commitmentBase,
				frequency: v.literal("monthly"),
				dueDay: v.number(),
			}),
			v.object({
				...commitmentBase,
				frequency: v.literal("once"),
				dueDate: v.string(),
			}),
		),
	).index("by_spaceId", ["spaceId"]),

	goals: defineTable({
		spaceId: v.id("spaces"),
		name: v.string(),
		targetCents: v.number(),
		targetMonth: v.optional(v.string()),
	}).index("by_spaceId", ["spaceId"]),
});
