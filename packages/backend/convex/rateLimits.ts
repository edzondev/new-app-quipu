import { HOUR, MINUTE, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { ConvexError, type Infer, v } from "convex/values";
import { components } from "./_generated/api";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";

const TOO_FAST = "Vas muy rápido. Espera un momento.";

const limiter = new RateLimiter(components.rateLimiter, {
	codeEvery90s: { kind: "token bucket", rate: 1, period: 90 * SECOND, capacity: 1 },
	codesPerHour: { kind: "fixed window", rate: 6, period: HOUR },
	householdJoin: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
	writes: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 60 },
	billing: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
});

const resultValidator = v.object({
	ok: v.boolean(),
	waitMs: v.number(),
	limit: v.union(v.literal("90s"), v.literal("hour"), v.null()),
});

function reject(waitMs: number, limit: "90s" | "hour"): Infer<typeof resultValidator> {
	return { ok: false, waitMs, limit };
}

export const reserveCodeSend = internalMutation({
	args: { email: v.string() },
	returns: resultValidator,
	handler: async (ctx, { email }): Promise<Infer<typeof resultValidator>> => {
		const hour = await limiter.check(ctx, "codesPerHour", { key: email });
		if (!hour.ok) return reject(hour.retryAfter, "hour");
		const short = await limiter.limit(ctx, "codeEvery90s", { key: email });
		if (!short.ok) return reject(short.retryAfter, "90s");
		await limiter.limit(ctx, "codesPerHour", { key: email });
		return { ok: true, waitMs: 0, limit: null };
	},
});

export async function limitHouseholdJoin(ctx: MutationCtx, userId: string) {
	const result = await limiter.limit(ctx, "householdJoin", { key: userId });
	return result.ok;
}

/** 60 writes per minute per user. Mutations that go through requireWritable* call this. */
export async function limitWrites(ctx: MutationCtx, userId: string) {
	const result = await limiter.limit(ctx, "writes", { key: userId });
	if (!result.ok) throw new ConvexError(TOO_FAST);
}

/** 5 Polar checkout/portal opens per minute per user. Actions call this directly. */
export async function limitBilling(ctx: ActionCtx, userId: string) {
	const result = await limiter.limit(ctx, "billing", { key: userId });
	if (!result.ok) throw new ConvexError(TOO_FAST);
}
