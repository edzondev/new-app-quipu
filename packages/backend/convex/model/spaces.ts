import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

type Ctx = QueryCtx | MutationCtx;
export type SpaceKind = Doc<"spaces">["kind"];

export function requireUser(ctx: MutationCtx) {
	return authComponent.getAuthUser(ctx);
}

export function getPersonalSpace(ctx: Ctx, userId: string) {
	return ctx.db
		.query("spaces")
		.withIndex("by_ownerId_kind", (q) => q.eq("ownerId", userId).eq("kind", "personal"))
		.unique();
}

export async function getHousehold(ctx: Ctx, userId: string) {
	const membership = await ctx.db
		.query("spaceMembers")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.first();
	return membership ? await ctx.db.get("spaces", membership.spaceId) : null;
}

export async function requireSpace(ctx: Ctx, kind: SpaceKind) {
	const user = await authComponent.getAuthUser(ctx);
	const space =
		kind === "personal" ? await getPersonalSpace(ctx, user._id) : await getHousehold(ctx, user._id);
	if (!space) {
		throw new ConvexError(
			kind === "personal" ? "Termina tus primeros pasos." : "Aún no tienes un hogar.",
		);
	}
	return { userId: user._id, space };
}

/** The row must belong to your personal space or your household. */
export async function requireSpaceById(ctx: Ctx, spaceId: Id<"spaces">) {
	const user = await authComponent.getAuthUser(ctx);
	const [personal, household] = await Promise.all([
		getPersonalSpace(ctx, user._id),
		getHousehold(ctx, user._id),
	]);
	const space = [personal, household].find((item) => item?._id === spaceId);
	if (!space) throw new ConvexError("No encontramos este dato.");
	return { userId: user._id, space };
}

export async function requirePlan(ctx: Ctx, space: Doc<"spaces">) {
	const profile = await ctx.db
		.query("profiles")
		.withIndex("by_userId", (q) => q.eq("userId", space.ownerId))
		.unique();
	if (!profile?.plan) throw new ConvexError("Termina tus primeros pasos.");
	return profile.plan;
}
