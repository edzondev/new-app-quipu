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
	| { kind: "subscription"; subscription: Subscription; userId: string | null }
	| { kind: "product" }
	| { kind: "ignored" }
	| { kind: "unreadable"; reason: string };

type PolarSubscription = z.infer<typeof Subscription$inboundSchema>;

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

/** What the component stores. Same mapping as its own webhook handler, which is not exported. */
function toComponentSubscription(sub: PolarSubscription, modifiedAt: string | null): Subscription {
	return {
		id: sub.id,
		customerId: sub.customerId,
		createdAt: sub.createdAt.toISOString(),
		// Polar's own text, not a Date round-trip: the component orders events by comparing it,
		// and the round-trip drops the microseconds that tell two close events apart.
		modifiedAt,
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

/** Our user, as startCheckout stamps it on the Polar customer: externalId, or metadata.userId. */
function customerUserId(customer: PolarSubscription["customer"]) {
	const fromMetadata = customer.metadata.userId;
	return customer.externalId ?? (typeof fromMetadata === "string" ? fromMetadata : null);
}

const envelope = z.object({ type: z.string(), data: z.unknown() });
const rawTimes = z.object({ modified_at: z.string().nullable() });

const issuePaths = (error: { issues: readonly { path: readonly PropertyKey[] }[] }) =>
	error.issues.map((issue) => issue.path.map(String).join(".")).join(", ");

/** Never throws: a body that cannot be read comes back as "unreadable" with the fields to blame. */
export function parseEvent(body: string): PolarEvent {
	let json: unknown;
	try {
		json = JSON.parse(body);
	} catch {
		return { kind: "unreadable", reason: "the body is not JSON" };
	}
	const parsed = envelope.safeParse(json);
	if (!parsed.success)
		return { kind: "unreadable", reason: `envelope: ${issuePaths(parsed.error)}` };
	const { type, data } = parsed.data;
	if (PRODUCT_EVENTS.has(type)) return { kind: "product" };
	if (!SUBSCRIPTION_EVENTS.has(type)) return { kind: "ignored" };

	const subscription = Subscription$inboundSchema.safeParse(data);
	if (!subscription.success) {
		return { kind: "unreadable", reason: `${type}: ${issuePaths(subscription.error)}` };
	}
	const times = rawTimes.safeParse(data);
	if (!times.success) return { kind: "unreadable", reason: `${type}: ${issuePaths(times.error)}` };
	return {
		kind: "subscription",
		subscription: toComponentSubscription(subscription.data, times.data.modified_at),
		userId: customerUserId(subscription.data.customer),
	};
}
