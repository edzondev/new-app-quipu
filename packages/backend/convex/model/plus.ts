import { ConvexError } from "convex/values";
import { NEED_PLUS } from "../../shared/billing";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { getMemberIds, requireSpace, type SpaceKind } from "./spaces";

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

export const TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

async function hasTrial(ctx: Ctx, userId: string) {
	const profile = await getProfile(ctx, userId);
	return profile?.trialEndsAt !== undefined && profile.trialEndsAt > Date.now();
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

/** Had a trial or any subscription at some point, even a lapsed one. */
export async function hadPlus(ctx: Ctx, userId: string) {
	if ((await getProfile(ctx, userId))?.trialEndsAt !== undefined) return true;
	const all = await ctx.runQuery(components.polar.lib.listAllUserSubscriptions, { userId });
	return all.length > 0;
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
	for (const userId of ownerFirst) if (await hadPlus(ctx, userId)) return userId;
	return null;
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
