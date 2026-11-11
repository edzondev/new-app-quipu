import type { Subscription } from "@convex-dev/polar";
import { Subscription$inboundSchema } from "@polar-sh/sdk/models/components/subscription.js";
import { z } from "zod";

const SUBSCRIPTION_EVENTS = new Set([
	"subscription.created",
	"subscription.updated",
	"subscription.active",
	"subscription.canceled",
	"subscription.uncanceled",
	"subscription.revoked",
	"subscription.past_due",
]);
const PRODUCT_EVENTS = new Set(["product.created", "product.updated"]);

export type PolarEvent =
	| { kind: "subscription"; subscription: Subscription }
	| { kind: "product" }
	| { kind: "ignored" };

type PolarSubscription = z.infer<typeof Subscription$inboundSchema>;

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

/** What the component stores. Same mapping as its own webhook handler, which is not exported. */
function toComponentSubscription(sub: PolarSubscription): Subscription {
	return {
		id: sub.id,
		customerId: sub.customerId,
		createdAt: sub.createdAt.toISOString(),
		modifiedAt: iso(sub.modifiedAt),
		productId: sub.productId,
		checkoutId: sub.checkoutId,
		amount: sub.amount,
		currency: sub.currency,
		recurringInterval: sub.recurringInterval,
		status: sub.status,
		currentPeriodStart: sub.currentPeriodStart.toISOString(),
		currentPeriodEnd: iso(sub.currentPeriodEnd),
		cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
		customerCancellationReason: sub.customerCancellationReason,
		customerCancellationComment: sub.customerCancellationComment,
		startedAt: iso(sub.startedAt),
		endedAt: iso(sub.endedAt),
		metadata: sub.metadata,
		discountId: sub.discountId,
		canceledAt: iso(sub.canceledAt),
		endsAt: iso(sub.endsAt),
		recurringIntervalCount: sub.recurringIntervalCount,
		trialStart: iso(sub.trialStart),
		trialEnd: iso(sub.trialEnd),
		seats: sub.seats ?? null,
		customFieldData: sub.customFieldData,
	};
}

const envelope = z.object({ type: z.string(), data: z.unknown() });

/** Null when the body is not a well-formed Polar event. */
export function parseEvent(body: string): PolarEvent | null {
	let json: unknown;
	try {
		json = JSON.parse(body);
	} catch {
		return null;
	}
	const parsed = envelope.safeParse(json);
	if (!parsed.success) return null;
	const { type, data } = parsed.data;
	if (PRODUCT_EVENTS.has(type)) return { kind: "product" };
	if (!SUBSCRIPTION_EVENTS.has(type)) return { kind: "ignored" };
	const subscription = Subscription$inboundSchema.safeParse(data);
	return subscription.success
		? { kind: "subscription", subscription: toComponentSubscription(subscription.data) }
		: null;
}
