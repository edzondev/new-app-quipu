import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

export function requireUser(ctx: MutationCtx) {
	return authComponent.getAuthUser(ctx);
}

export function getPersonalSpace(ctx: QueryCtx, userId: string) {
	return ctx.db
		.query("spaces")
		.withIndex("by_ownerId_kind", (q) => q.eq("ownerId", userId).eq("kind", "personal"))
		.unique();
}
