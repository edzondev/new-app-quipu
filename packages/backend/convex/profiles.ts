import { ConvexError, type Infer, v } from "convex/values";
import {
	applyIncome,
	isValidCents,
	MAX_ONBOARDING_COMMITMENTS,
	NOTE_MAX_LENGTH,
	ZERO_AMOUNTS,
} from "../shared/budget";
import { getLimaDate } from "../shared/dates";
import { isValidMonthDay, isValidPlan, isValidSplit } from "../shared/plan";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { authComponent } from "./auth";
import { createFirstCycle } from "./model/cycles";
import { getPersonalSpace, requireUser } from "./model/spaces";
import { plan, split } from "./schema";

const onboardingCommitment = v.object({
	name: v.string(),
	amountCents: v.number(),
	dueDay: v.number(),
});

function getProfile(ctx: QueryCtx, userId: string) {
	return ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();
}

// Named for @convex-dev/require-access-control on public queries.
function checkAccess(ctx: QueryCtx) {
	return authComponent.safeGetAuthUser(ctx);
}

// Expects an already trimmed name.
function isValidOnboardingCommitment({
	name,
	amountCents,
	dueDay,
}: Infer<typeof onboardingCommitment>) {
	return (
		name.length > 0 &&
		name.length <= NOTE_MAX_LENGTH &&
		isValidCents(amountCents) &&
		isValidMonthDay(dueDay)
	);
}

export const myProfile = query({
	args: {},
	returns: v.union(v.null(), v.object({ name: v.string(), plan: v.union(plan, v.null()) })),
	handler: async (ctx) => {
		const user = await checkAccess(ctx);
		if (!user) return null;
		const profile = await getProfile(ctx, user._id);
		if (!profile) return null;
		return { name: user.name, plan: profile.plan ?? null };
	},
});

export const completeOnboarding = mutation({
	args: {
		...plan.fields,
		todayCents: v.number(),
		split,
		commitments: v.array(onboardingCommitment),
	},
	returns: v.null(),
	handler: async (ctx, { commitments, split: splitValue, todayCents, ...planValue }) => {
		const user = await requireUser(ctx);
		const profile = await getProfile(ctx, user._id);
		if (!profile) throw new ConvexError("No encontramos tu perfil.");

		const cleaned = commitments.map((c) => ({ ...c, name: c.name.trim() }));
		const commitmentsCents = cleaned.reduce((sum, { amountCents }) => sum + amountCents, 0);
		if (
			!isValidPlan(planValue) ||
			!isValidCents(todayCents) ||
			!isValidSplit(splitValue) ||
			cleaned.length > MAX_ONBOARDING_COMMITMENTS ||
			!cleaned.every(isValidOnboardingCommitment) ||
			commitmentsCents > todayCents
		) {
			throw new ConvexError("Revisa los datos e inténtalo otra vez.");
		}

		// First onboarding wins. Later changes go through Ajustes, so a second call
		// must not rewrite the plan while leaving the first cycle untouched.
		if (await getPersonalSpace(ctx, user._id)) return null;

		const today = getLimaDate();
		await ctx.db.patch("profiles", profile._id, { plan: planValue });
		const spaceId = await ctx.db.insert("spaces", { kind: "personal", ownerId: user._id });
		const cycleId = await createFirstCycle(ctx, spaceId, planValue, splitValue, today);
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
		for (const commitment of cleaned) {
			await ctx.db.insert("commitments", {
				spaceId,
				...commitment,
				envelope: "needs",
				frequency: "monthly",
			});
		}
		return null;
	},
});
