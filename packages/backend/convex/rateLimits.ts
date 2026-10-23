import { HOUR, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const limiter = new RateLimiter(components.rateLimiter, {
	codeEvery90s: { kind: "token bucket", rate: 1, period: 90 * SECOND, capacity: 1 },
	codesPerHour: { kind: "fixed window", rate: 6, period: HOUR },
});

export const reserveCodeSend = internalMutation({
	args: { email: v.string() },
	returns: v.union(v.object({ waitMs: v.number() }), v.null()),
	handler: async (ctx, { email }) => {
		const hour = await limiter.check(ctx, "codesPerHour", { key: email });
		if (!hour.ok) return { waitMs: hour.retryAfter };
		const short = await limiter.limit(ctx, "codeEvery90s", { key: email });
		if (!short.ok) return { waitMs: short.retryAfter };
		await limiter.limit(ctx, "codesPerHour", { key: email });
		return null;
	},
});
