import { ConvexError } from "convex/values";
import { NEED_PLUS, type PlusHistory, type PlusStatus, toInterval } from "../../shared/billing";
import { displayName } from "../../shared/household";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";
import { getHousehold, getMemberIds, requireSpace, type SpaceKind } from "./spaces";

type Ctx = QueryCtx | MutationCtx;

function getProfile(ctx: Ctx, userId: string) {
	return ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();
}

// Paid states. past_due is the grace period while Polar retries the charge: it flips to
// unpaid or revoked by webhook if the retries fail.
const PAID_STATUSES = ["active", "trialing", "past_due"];

/** Cancelled at period end stays "active" until it ends; a "canceled" one is Plus only until its paid period closes. */
export function subscriptionGivesPlus(
	sub: { status: string; currentPeriodEnd: string | null },
	now: number,
) {
	if (sub.status === "canceled") {
		return sub.currentPeriodEnd !== null && Date.parse(sub.currentPeriodEnd) > now;
	}
	return PAID_STATUSES.includes(sub.status);
}

/** Of the subscriptions that give Plus now (a plan change leaves two), the one that runs the longest. */
export async function getPlusSubscription(ctx: Ctx | ActionCtx, userId: string) {
	const subscriptions = await ctx.runQuery(components.polar.lib.listUserSubscriptions, { userId });
	const now = Date.now();
	const periodEnd = (sub: { currentPeriodEnd: string | null }) =>
		sub.currentPeriodEnd === null ? Infinity : Date.parse(sub.currentPeriodEnd);
	return subscriptions
		.filter((sub) => subscriptionGivesPlus(sub, now))
		.sort((a, b) => periodEnd(b) - periodEnd(a))
		.at(0);
}

/** When the trial ends, or null if there is none open. */
async function getTrialEnd(ctx: Ctx, userId: string) {
	const endsAt = (await getProfile(ctx, userId))?.trialEndsAt;
	return endsAt !== undefined && endsAt > Date.now() ? endsAt : null;
}

async function hasTrial(ctx: Ctx, userId: string) {
	return (await getTrialEnd(ctx, userId)) !== null;
}

/** Plus = our 14-day trial still open, or a paid Polar subscription. */
export async function hasPlus(ctx: Ctx, userId: string) {
	return (await hasTrial(ctx, userId)) || (await getPlusSubscription(ctx, userId)) !== undefined;
}

export async function requirePlus(ctx: Ctx, userId: string) {
	if (!(await hasPlus(ctx, userId))) throw new ConvexError(NEED_PLUS);
}

const READ_ONLY = "Solo lectura. Activa Plus para seguir anotando.";

/** In a household whoever pays decides: it has Plus while either of the two does. */
export async function householdHasPlus(ctx: Ctx, spaceId: Id<"spaces">) {
	for (const userId of await getMemberIds(ctx, spaceId)) {
		if (await hasPlus(ctx, userId)) return true;
	}
	return false;
}

// A checkout that was never completed or a first charge that failed: Polar never took any money.
const NEVER_CHARGED = ["incomplete", "incomplete_expired"];

/**
 * Where the Plus this person ever had came from, even a lapsed one. A subscription of their own that
 * was charged at least once outranks the trial. startTrial and getPayerId read it the same way.
 */
export async function plusHistory(ctx: Ctx, userId: string): Promise<PlusHistory> {
	const all = await ctx.runQuery(components.polar.lib.listAllUserSubscriptions, { userId });
	if (all.some((sub) => !NEVER_CHARGED.includes(sub.status))) return "paid";
	return (await getProfile(ctx, userId))?.trialEndsAt !== undefined ? "trial" : "none";
}

/**
 * Who pays: whoever has a subscription now, else whoever is on a trial now; the owner first
 * when both qualify. When nobody has Plus, whoever had it last, so the read-only strip can
 * say whose Plus ended. Null when neither ever had one.
 */
export async function getPayerId(ctx: Ctx, space: Doc<"spaces">) {
	const members = await getMemberIds(ctx, space._id);
	const ownerFirst = [...members].sort(
		(a, b) => Number(b === space.ownerId) - Number(a === space.ownerId),
	);

	for (const userId of ownerFirst) if (await getPlusSubscription(ctx, userId)) return userId;
	for (const userId of ownerFirst) if (await hasTrial(ctx, userId)) return userId;
	for (const userId of ownerFirst) if ((await plusHistory(ctx, userId)) !== "none") return userId;
	return null;
}

type Subscription = NonNullable<Awaited<ReturnType<typeof getPlusSubscription>>>;

function subscriptionStatus(sub: Subscription): PlusStatus {
	const interval = toInterval(sub.recurringInterval);
	const periodEnd = sub.currentPeriodEnd === null ? null : Date.parse(sub.currentPeriodEnd);
	if (sub.status === "past_due") return { kind: "pastDue", interval };
	if (sub.cancelAtPeriodEnd || sub.status === "canceled") {
		return { kind: "ending", interval, endsAt: periodEnd };
	}
	return {
		kind: "paid",
		interval,
		// Only soles: a USD amount would be shown with an S/.
		amountCents: sub.currency === "pen" ? sub.amount : null,
		renewsAt: periodEnd,
	};
}

/**
 * What Tu plan says about this person: their own subscription, else the household's Plus when the
 * partner pays, else their trial, else whether a trial or a subscription ended, else Gratis.
 */
export async function getPlusStatus(ctx: Ctx, userId: string): Promise<PlusStatus> {
	const sub = await getPlusSubscription(ctx, userId);
	if (sub) return subscriptionStatus(sub);

	const space = await getHousehold(ctx, userId);
	const payerId = space ? await getPayerId(ctx, space) : null;
	if (space && payerId && payerId !== userId && (await householdHasPlus(ctx, space._id))) {
		const payer = await authComponent.getAnyUserById(ctx, payerId);
		return {
			kind: "household",
			payerName: displayName(payer?.name ?? ""),
			payerOnTrial: !(await getPlusSubscription(ctx, payerId)),
		};
	}

	const trialEndsAt = await getTrialEnd(ctx, userId);
	if (trialEndsAt !== null) return { kind: "trial", endsAt: trialEndsAt };

	const history = await plusHistory(ctx, userId);
	if (history === "trial") return { kind: "trialEnded" };
	if (history === "paid") return { kind: "lapsed", payerIsMe: !space || payerId === userId };
	return { kind: "free" };
}

/** Personal is never read-only. A household without Plus can be read, closed and left, not written. */
export async function requireWritable(ctx: Ctx, space: Doc<"spaces">) {
	if (space.kind === "household" && !(await householdHasPlus(ctx, space._id))) {
		throw new ConvexError(READ_ONLY);
	}
}

export async function requireWritableSpace(ctx: Ctx, kind: SpaceKind) {
	const found = await requireSpace(ctx, kind);
	await requireWritable(ctx, found.space);
	return found;
}
