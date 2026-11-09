import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getMemberIds, requireSpace, type SpaceKind } from "./spaces";

type Ctx = QueryCtx | MutationCtx;

const NEED_PLUS = "Esto requiere Quipu Plus.";

/** Plus for now = trial still open. Subscriptions land later (Polar / RevenueCat). */
export async function hasPlus(ctx: Ctx, userId: string) {
	const profile = await ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.unique();
	return profile?.trialEndsAt !== undefined && profile.trialEndsAt > Date.now();
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
