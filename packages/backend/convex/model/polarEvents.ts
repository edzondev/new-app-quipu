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
		// In sortableTime form: the component orders events by comparing this text.
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

const POLAR_TIME =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):?(\d{2}))$/i;

/**
 * One text form for an instant, so comparing two texts orders them in time: UTC with six
 * fraction digits ("2026-10-30T00:00:00.123400Z"). It keeps the microseconds that tell two
 * close events apart; only the whole seconds go through Date, to apply the offset.
 * Null when the text is not an ISO date-time.
 */
export function sortableTime(text: string): string | null {
	const match = POLAR_TIME.exec(text);
	if (!match) return null;
	const [, year, month, day, hour, minute, second, fraction = "", zone, sign, offH, offM] = match;
	const offsetMinutes =
		zone.toUpperCase() === "Z" ? 0 : (sign === "-" ? -1 : 1) * (Number(offH) * 60 + Number(offM));
	const wholeMs = Date.UTC(+year, +month - 1, +day, +hour, +minute - offsetMinutes, +second);
	if (Number.isNaN(wholeMs)) return null;
	const whole = new Date(wholeMs).toISOString().slice(0, 19);
	return `${whole}.${fraction.padEnd(6, "0").slice(0, 6)}Z`;
}

/** True when `stored` is later than `incoming`: that event is stale and must not be written. */
export function isOlderThanStored(incoming: string | null, stored: string | null) {
	const sortable = (text: string | null) => (text === null ? "" : (sortableTime(text) ?? ""));
	return sortable(stored) > sortable(incoming);
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
	const text = times.data.modified_at;
	const modifiedAt = text === null ? null : sortableTime(text);
	if (text !== null && modifiedAt === null) {
		return { kind: "unreadable", reason: `${type}: modified_at` };
	}

	// Our user, as startCheckout stamps it on the Polar customer: externalId, or metadata.userId.
	// Both there and different: linking either could hand one person's subscription to the other.
	const { id: customerId, externalId, metadata } = subscription.data.customer;
	const fromMetadata = typeof metadata.userId === "string" ? metadata.userId : null;
	if (externalId && fromMetadata && externalId !== fromMetadata) {
		return {
			kind: "unreadable",
			reason: `${type}: customer ${customerId} has an externalId and a metadata.userId that differ`,
		};
	}
	return {
		kind: "subscription",
		subscription: toComponentSubscription(subscription.data, modifiedAt),
		userId: externalId ?? fromMetadata,
	};
}
