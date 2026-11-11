import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { EVENT_TYPES } from "../shared/activity";

export const plan = v.object({
	cadence: v.union(v.literal("monthly"), v.literal("biweekly"), v.literal("weekly")),
	cycleStartDay: v.union(v.number(), v.literal("last")),
	incomeCents: v.optional(v.number()),
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

export const spendableAmounts = v.object({
	needsCents: v.number(),
	wantsCents: v.number(),
});

// How a cycle's money added up when it closed. Absent means it closed before this existed.
export const closeSummary = v.union(
	v.object({
		status: v.literal("ok"),
		assigned: spendableAmounts,
		spent: spendableAmounts,
		fundedCents: v.number(),
	}),
	v.object({ status: v.literal("tooManyMovements") }),
	v.object({ status: v.literal("inconsistent") }),
);

export const envelope = v.union(v.literal("needs"), v.literal("wants"), v.literal("savings"));
export const spendable = v.union(v.literal("needs"), v.literal("wants"));
export const spaceKind = v.union(v.literal("personal"), v.literal("household"));

const [firstEvent, secondEvent, ...otherEvents] = EVENT_TYPES;
export const eventType = v.union(
	v.literal(firstEvent),
	v.literal(secondEvent),
	...otherEvents.map((type) => v.literal(type)),
);

// How a monthly commitment decides its day. Rows from before this existed keep a plain `dueDay`.
export const dueRule = v.union(
	v.object({ kind: v.literal("day"), day: v.number() }),
	v.object({ kind: v.literal("last") }),
	v.object({ kind: v.literal("beforeEnd"), days: v.number() }),
	v.object({ kind: v.literal("mid") }),
);

// A day that only counts in its own month ("2026-11"); the next month goes back to the rule.
export const dueAdjustment = v.object({ month: v.string(), day: v.number() });

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

export const movementKind = v.union(
	v.literal("expense"),
	v.literal("income"),
	v.literal("contribution"),
	v.literal("saving"),
	v.literal("withdrawal"),
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
		// A cycle change waits here and becomes `plan` when the next personal cycle is created.
		nextPlan: v.optional(plan),
		lastSeenClosedCycleId: v.optional(v.id("cycles")),
		// The same for the household's closes: each person dismisses their own notice.
		lastSeenHouseholdClosedCycleId: v.optional(v.id("cycles")),
		// Withdrawals from the household fund by the other person up to this time were already seen.
		seenWithdrawalAt: v.optional(v.number()),
		// Quipu Plus trial end (ms). Set by us on the server for 14 days, no card, when the person asks.
		// Polar (web) and RevenueCat (mobile) only charge.
		trialEndsAt: v.optional(v.number()),
		// The B1 welcome was closed. On the server so another device does not show it again.
		welcomeSeenAt: v.optional(v.number()),
		// The notice that the trial ended (V1) was closed. The same, one time across devices.
		trialEndedSeenAt: v.optional(v.number()),
	}).index("by_userId", ["userId"]),

	spaces: defineTable({
		kind: spaceKind,
		ownerId: v.string(),
		name: v.optional(v.string()),
		cadence: v.optional(plan.fields.cadence),
		cycleStartDay: v.optional(plan.fields.cycleStartDay),
		inviteCode: v.optional(v.string()),
		inviteExpiresAt: v.optional(v.number()),
		// Set when the other person leaves; the one who stays dismisses it.
		partnerLeft: v.optional(v.object({ name: v.string() })),
		fundGoalCents: v.optional(v.number()),
		// Emergency fund cash. Updated on fund saves/withdrawals (not goal saves).
		fundCents: v.number(),
	})
		.index("by_ownerId_kind", ["ownerId", "kind"])
		.index("by_inviteCode", ["inviteCode"]),

	spaceMembers: defineTable({
		spaceId: v.id("spaces"),
		userId: v.string(),
		joinedAt: v.optional(v.number()),
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
		carryIn: spendableAmounts,
		// Money net-moved between envelopes by split changes. Zero-sum; only `updateSplit` writes it.
		reallocated: v.optional(amounts),
		closeSummary: v.optional(closeSummary),
	})
		.index("by_space_closedAt", ["spaceId", "closedAt"])
		.index("by_space_start", ["spaceId", "startDate"]),

	transactions: defineTable(
		v.union(
			v.object({
				...movement,
				kind: v.literal("expense"),
				envelope: spendable,
			}),
			// A commitment payment always says which month's due date it covers ("2026-10").
			v.object({
				...movement,
				kind: v.literal("expense"),
				envelope: spendable,
				commitmentId: v.id("commitments"),
				forMonth: v.string(),
			}),
			v.object({
				...movement,
				kind: v.literal("income"),
				extraType: v.optional(extraType),
				toSavings: v.optional(v.boolean()),
				forNextCycle: v.optional(v.boolean()),
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
		.index("by_forNextCycle_cycleId", ["forNextCycle", "cycleId"])
		.index("by_toCycleId", ["toCycleId"])
		.index("by_spaceId_kind", ["spaceId", "kind"])
		.index("by_commitmentId", ["commitmentId"]),

	commitments: defineTable(
		v.union(
			v.object({
				...commitmentBase,
				frequency: v.literal("monthly"),
				rule: dueRule,
				adjustment: v.optional(dueAdjustment),
			}),
			// Before rules: read as { kind: "day", day: dueDay }, so no data had to be migrated.
			v.object({
				...commitmentBase,
				frequency: v.literal("monthly"),
				dueDay: v.number(),
				adjustment: v.optional(dueAdjustment),
			}),
			v.object({
				...commitmentBase,
				frequency: v.literal("once"),
				dueDate: v.string(),
			}),
		),
	).index("by_spaceId", ["spaceId"]),

	// Who changed what in a household: every shared change and every fund withdrawal. Never written for Personal.
	spaceEvents: defineTable({
		spaceId: v.id("spaces"),
		userId: v.string(),
		type: eventType,
		detail: v.optional(v.string()),
		before: v.optional(v.string()),
		after: v.optional(v.string()),
		amountCents: v.optional(v.number()),
	})
		// Activity lists every type in time order; by_space_type only finds one type.
		// eslint-disable-next-line @convex-dev/no-duplicate-indexes
		.index("by_spaceId", ["spaceId"])
		.index("by_space_type", ["spaceId", "type"]),

	goals: defineTable({
		spaceId: v.id("spaces"),
		name: v.string(),
		targetCents: v.number(),
		targetMonth: v.optional(v.string()),
	}).index("by_spaceId", ["spaceId"]),
});
