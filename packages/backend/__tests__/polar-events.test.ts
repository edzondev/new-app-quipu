import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import { type Harness, harness, setTrialEnd, START, startUser } from "./couple";
import { polarSubscription } from "./polar-fixtures";

const SECRET = `whsec_${btoa("quipu-test-secret-0123456789abcd")}`;
const NOW = Date.parse(START);

beforeEach(() => {
	process.env.POLAR_WEBHOOK_SECRET = SECRET;
	// Fake timers also keep the scheduled product sync from running a real network call.
	vi.useFakeTimers({ now: new Date(START) });
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

async function signedHeaders(body: string) {
	const id = `msg_${Math.random().toString(36).slice(2)}`;
	const seconds = String(Math.floor(Date.now() / 1000));
	const key = await crypto.subtle.importKey(
		"raw",
		Uint8Array.from(atob(SECRET.slice(6)), (char) => char.charCodeAt(0)),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(`${id}.${seconds}.${body}`),
	);
	const signature = btoa(String.fromCharCode(...new Uint8Array(mac)));
	return { "webhook-id": id, "webhook-timestamp": seconds, "webhook-signature": `v1,${signature}` };
}

function post(t: Harness, body: string, headers: Record<string, string>) {
	return t.fetch("/polar/events", { method: "POST", headers, body });
}

async function deliver(t: Harness, type: string, over: Record<string, unknown> = {}) {
	const body = JSON.stringify({ type, data: { ...polarSubscription, ...over } });
	return await post(t, body, await signedHeaders(body));
}

const stored = (t: Harness) => t.query(components.polar.lib.getSubscription, { id: "sub_1" });

/** The customer of the fixture, naming (or not) our user the way startCheckout stamps it. */
const customer = (externalId: string | null, metadata: Record<string, string> = {}) => ({
	customer: { ...polarSubscription.customer, external_id: externalId, metadata },
});

async function lapsedUser() {
	const t = harness();
	const user = await startUser(t, "camila@correo.com", "Camila Rojas");
	await setTrialEnd(t, user.userId, NOW - 1);
	return { t, user };
}

/** A lapsed person already linked to the Polar customer of the fixture. */
async function payer() {
	const { t, user } = await lapsedUser();
	await t.mutation(components.polar.lib.insertCustomer, { id: "cus_1", userId: user.userId });
	return { t, user };
}

type Person = Awaited<ReturnType<typeof lapsedUser>>["user"];
const hasPlus = async (user: Person) => (await user.as.query(api.profiles.myProfile, {}))?.hasPlus;

test("a signed subscription event is stored and gives its customer Plus", async () => {
	const { t, user } = await payer();
	expect(await hasPlus(user)).toBe(false);
	expect((await deliver(t, "subscription.created")).status).toBe(202);
	expect((await stored(t))?.status).toBe("active");
	expect(await hasPlus(user)).toBe(true);
});

test.each([
	"subscription.created",
	"subscription.updated",
	"subscription.active",
	"subscription.canceled",
	"subscription.uncanceled",
	"subscription.revoked",
	"subscription.past_due",
])("%s is accepted and stored", async (type) => {
	const { t } = await payer();
	expect((await deliver(t, type)).status).toBe(202);
	expect(await stored(t)).not.toBeNull();
});

test("the same delivery twice, same id and signature, leaves one subscription", async () => {
	const { t, user } = await payer();
	const body = JSON.stringify({ type: "subscription.created", data: polarSubscription });
	const headers = await signedHeaders(body);
	expect((await post(t, body, headers)).status).toBe(202);
	expect((await post(t, body, headers)).status).toBe(202);
	const all = await t.query(components.polar.lib.listUserSubscriptions, { userId: user.userId });
	expect(all).toHaveLength(1);
});

test("an older event arriving late does not undo a newer one", async () => {
	const { t } = await payer();
	await deliver(t, "subscription.revoked", {
		status: "canceled",
		ended_at: "2026-10-19T00:00:00Z",
		modified_at: "2026-10-30T00:00:00Z",
	});
	await deliver(t, "subscription.active", { modified_at: "2026-10-29T00:00:00Z" });
	expect((await stored(t))?.status).toBe("canceled");
});

test("two events within the same millisecond are told apart by their microseconds", async () => {
	const { t } = await payer();
	await deliver(t, "subscription.revoked", {
		status: "canceled",
		ended_at: "2026-10-19T00:00:00Z",
		modified_at: "2026-10-30T00:00:00.123456Z",
	});
	await deliver(t, "subscription.active", { modified_at: "2026-10-30T00:00:00.123400Z" });
	expect((await stored(t))?.status).toBe("canceled");
});

test("a revoked subscription gives no Plus, even with its paid period still open", async () => {
	const { t, user } = await payer();
	await deliver(t, "subscription.created");
	expect(await hasPlus(user)).toBe(true);
	await deliver(t, "subscription.revoked", {
		status: "canceled",
		ended_at: "2026-10-19T00:00:00Z",
		modified_at: "2026-10-31T00:00:00Z",
	});
	expect(await hasPlus(user)).toBe(false);
});

test("a customer the component does not know is linked by externalId", async () => {
	const { t, user } = await lapsedUser();
	await deliver(t, "subscription.created", customer(user.userId));
	expect(await hasPlus(user)).toBe(true);
});

test("a customer the component does not know is linked by metadata.userId", async () => {
	const { t, user } = await lapsedUser();
	await deliver(t, "subscription.created", customer(null, { userId: user.userId }));
	expect(await hasPlus(user)).toBe(true);
});

test("a subscription whose customer names no user is stored, logged, and accepted", async () => {
	const { t, user } = await lapsedUser();
	const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	expect((await deliver(t, "subscription.created", customer(null))).status).toBe(202);
	expect(await stored(t)).not.toBeNull();
	expect(warn).toHaveBeenCalledWith(expect.stringContaining("cus_1"));
	expect(await hasPlus(user)).toBe(false);
});

test("a bad signature is refused with 403 and stores nothing", async () => {
	const { t } = await payer();
	const body = JSON.stringify({ type: "subscription.created", data: polarSubscription });
	const res = await post(t, body, await signedHeaders("{}"));
	expect(res.status).toBe(403);
	expect(await stored(t)).toBeNull();
});

test("unknown and product events are accepted and store nothing", async () => {
	const { t } = await payer();
	expect((await deliver(t, "order.paid")).status).toBe(202);
	expect((await deliver(t, "product.updated")).status).toBe(202);
	expect(await stored(t)).toBeNull();
});

test("an event we cannot read is logged and still accepted, so Polar keeps the endpoint", async () => {
	const { t } = await payer();
	const error = vi.spyOn(console, "error").mockImplementation(() => {});
	expect((await deliver(t, "subscription.created", { status: 7 })).status).toBe(202);
	expect(error).toHaveBeenLastCalledWith(expect.stringContaining("subscription.created"));

	const notJson = "not json";
	expect((await post(t, notJson, await signedHeaders(notJson))).status).toBe(202);
	expect(error).toHaveBeenCalledTimes(2);
	expect(await stored(t)).toBeNull();
});
