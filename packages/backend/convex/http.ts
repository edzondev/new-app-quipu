import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { env, httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { parseEvent } from "./model/polarEvents";
import { verifyWebhook } from "./model/polarWebhook";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);

// Polar webhook. The component's own registerRoutes checks the old signature scheme, so
// we verify (Standard Webhooks) and hand the verified event to the component ourselves.
// Retries and out-of-order events are safe: the component upserts by id and skips stale ones.
// Anything we cannot use is logged and still answered 202: a 4xx makes Polar retry and,
// after enough failures, disable the endpoint.
http.route({
	path: "/polar/events",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const body = await request.text();
		if (!(await verifyWebhook(env.POLAR_WEBHOOK_SECRET, request.headers, body, Date.now()))) {
			return new Response("Forbidden", { status: 403 });
		}
		const webhookId = request.headers.get("webhook-id");
		const event = parseEvent(body);
		if (event.kind === "subscription") {
			const { subscription, userId } = event;
			if (userId) {
				await ctx.runMutation(components.polar.lib.insertCustomer, {
					id: subscription.customerId,
					userId,
				});
			} else {
				console.warn(`Polar ${webhookId}: customer ${subscription.customerId} has no userId`);
			}
			await ctx.runMutation(components.polar.lib.updateSubscription, { subscription });
		} else if (event.kind === "product") {
			await ctx.scheduler.runAfter(0, internal.polar.syncProducts, {});
		} else if (event.kind === "unreadable") {
			console.error(`Polar ${webhookId}: unreadable event, ${event.reason}`);
		}
		return new Response("Accepted", { status: 202 });
	}),
});
export default http;
