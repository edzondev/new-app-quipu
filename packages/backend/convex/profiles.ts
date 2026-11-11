import { ConvexError, type Infer, v } from "convex/values";
import * as z from "zod/mini";
import { applyIncome, ZERO_AMOUNTS } from "../shared/budget";
import { getLimaDate } from "../shared/dates";
import { nameSchema } from "../shared/name";
import { isValidPlan, isValidSplit } from "../shared/plan";
import { components } from "./_generated/api";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { createFirstCycle } from "./model/cycles";
import { BAD_INPUT, parseInput } from "./model/input";
import { hasPlus, plusHistory, TRIAL_MS } from "./model/plus";
import { checkAccess, getHousehold, getPersonalSpace, requireUser } from "./model/spaces";
import { plan, split } from "./schema";

function getProfile(ctx: QueryCtx, userId: string) {
	return ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();
}

export const myProfile = query({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			name: v.string(),
			plan: v.union(plan, v.null()),
			nextPlan: v.union(plan, v.null()),
			hasHousehold: v.boolean(),
			hasPlus: v.boolean(),
			plusHistory: v.union(v.literal("none"), v.literal("trial"), v.literal("paid")),
			welcomeSeen: v.boolean(),
			trialEndedSeen: v.boolean(),
		}),
	),
	handler: async (ctx) => {
		const user = await checkAccess(ctx);
		if (!user) return null;
		const profile = await getProfile(ctx, user._id);
		if (!profile) return null;
		return {
			name: user.name,
			plan: profile.plan ?? null,
			nextPlan: profile.nextPlan ?? null,
			hasHousehold: (await getHousehold(ctx, user._id)) !== null,
			hasPlus: await hasPlus(ctx, user._id),
			plusHistory: await plusHistory(ctx, user._id),
			welcomeSeen: profile.welcomeSeenAt !== undefined,
			trialEndedSeen: profile.trialEndedSeenAt !== undefined,
		};
	},
});

async function requireProfile(ctx: MutationCtx) {
	const user = await requireUser(ctx);
	const profile = await getProfile(ctx, user._id);
	if (!profile) throw new ConvexError("No encontramos tu perfil.");
	return { user, profile };
}

export const completeOnboarding = mutation({
	args: {
		name: v.string(),
		...plan.fields,
		todayCents: v.number(),
		split,
	},
	returns: v.null(),
	handler: async (ctx, { name, split: splitValue, todayCents, ...planValue }) => {
		const { user, profile } = await requireProfile(ctx);

		const cleanName = parseInput(nameSchema, name);
		parseInput(z.int().check(z.nonnegative()), todayCents);
		if (!isValidPlan(planValue) || !isValidSplit(splitValue)) throw new ConvexError(BAD_INPUT);

		// First onboarding wins. Later changes go through Ajustes, so a second call
		// must not rewrite the plan while leaving the first cycle untouched.
		if (await getPersonalSpace(ctx, user._id)) return null;

		// Same mutation as the plan, so a plan never exists without a name.
		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: user._id }],
				update: { name: cleanName },
			},
		});
		const today = getLimaDate();
		await ctx.db.patch("profiles", profile._id, { plan: planValue });
		const spaceId = await ctx.db.insert("spaces", {
			kind: "personal",
			ownerId: user._id,
			fundCents: 0,
		});
		const cycleId = await createFirstCycle(ctx, spaceId, planValue, splitValue, today);
		if (todayCents > 0) {
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
		}
		return null;
	},
});

const trialResult = v.union(
	v.object({ status: v.literal("active"), trialEndsAt: v.number() }),
	v.object({ status: v.literal("used") }),
);

/** One 14-day trial per person, only when they ask. A second call while it runs keeps its end. */
export const startTrial = mutation({
	args: {},
	returns: trialResult,
	handler: async (ctx): Promise<Infer<typeof trialResult>> => {
		const { user, profile } = await requireProfile(ctx);
		const now = Date.now();
		if (profile.trialEndsAt !== undefined && profile.trialEndsAt > now) {
			return { status: "active", trialEndsAt: profile.trialEndsAt };
		}
		if ((await plusHistory(ctx, user._id)) !== "none") return { status: "used" };
		const trialEndsAt = now + TRIAL_MS;
		await ctx.db.patch("profiles", profile._id, { trialEndsAt });
		return { status: "active", trialEndsAt };
	},
});

/** A notice closed on one device stays closed on all of them; the first close is the one kept. */
function markSeen(field: "welcomeSeenAt" | "trialEndedSeenAt") {
	return mutation({
		args: {},
		returns: v.null(),
		handler: async (ctx) => {
			const { profile } = await requireProfile(ctx);
			if (profile[field] === undefined) {
				await ctx.db.patch("profiles", profile._id, { [field]: Date.now() });
			}
			return null;
		},
	});
}

export const markWelcomeSeen = markSeen("welcomeSeenAt");
export const markTrialEndedSeen = markSeen("trialEndedSeenAt");
