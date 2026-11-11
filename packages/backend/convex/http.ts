import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { components } from "./_generated/api";
import { env, httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { parseEvent } from "./model/polarEvents";
import { verifyWebhook } from "./model/polarWebhook";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);

// Polar webhook. The component's own registerRoutes checks the old signature scheme, so
// we verify (Standard Webhooks) and hand the verified event to the component ourselves.
// Retries and out-of-order events are safe: the component upserts by id and skips stale ones.
http.route({
	path: "/polar/events",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const body = await request.text();
		if (!(await verifyWebhook(env.POLAR_WEBHOOK_SECRET, request.headers, body, Date.now()))) {
			return new Response("Forbidden", { status: 403 });
		}
		const event = parseEvent(body);
		if (!event) return new Response("Bad Request", { status: 400 });
		if (event.kind === "subscription") {
			await ctx.runMutation(components.polar.lib.updateSubscription, {
				subscription: event.subscription,
			});
		} else if (event.kind === "product") {
			await ctx.scheduler.runAfter(0, internal.polar.syncProducts, {});
		}
		return new Response("Accepted", { status: 202 });
	}),
});
export default http;
