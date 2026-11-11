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

async function deliver(t: Harness, type: string, over: Record<string, unknown> = {}) {
	const body = JSON.stringify({ type, data: { ...polarSubscription, ...over } });
	return await t.fetch("/polar/events", {
		method: "POST",
		headers: await signedHeaders(body),
		body,
	});
}

const stored = (t: Harness) => t.query(components.polar.lib.getSubscription, { id: "sub_1" });

async function payer() {
	const t = harness();
	const user = await startUser(t, "camila@correo.com", "Camila Rojas");
	await setTrialEnd(t, user.userId, NOW - 1);
	await t.mutation(components.polar.lib.insertCustomer, { id: "cus_1", userId: user.userId });
	return { t, user };
}

test("a signed subscription event is stored and gives its customer Plus", async () => {
	const { t, user } = await payer();
	expect((await user.as.query(api.profiles.myProfile, {}))?.hasPlus).toBe(false);
	expect((await deliver(t, "subscription.created")).status).toBe(202);
	expect((await stored(t))?.status).toBe("active");
	expect((await user.as.query(api.profiles.myProfile, {}))?.hasPlus).toBe(true);
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

test("a retried delivery leaves one subscription", async () => {
	const { t, user } = await payer();
	await deliver(t, "subscription.created");
	await deliver(t, "subscription.created");
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

test("a bad signature is refused with 403 and stores nothing", async () => {
	const { t } = await payer();
	const body = JSON.stringify({ type: "subscription.created", data: polarSubscription });
	const forged = { ...(await signedHeaders("{}")) };
	const res = await t.fetch("/polar/events", { method: "POST", headers: forged, body });
	expect(res.status).toBe(403);
	expect(await stored(t)).toBeNull();
});

test("unknown and product events are accepted; a malformed body is a 400", async () => {
	const { t } = await payer();
	expect((await deliver(t, "order.paid")).status).toBe(202);
	expect((await deliver(t, "product.updated")).status).toBe(202);
	expect(await stored(t)).toBeNull();

	const bad = "not json";
	const res = await t.fetch("/polar/events", {
		method: "POST",
		headers: await signedHeaders(bad),
		body: bad,
	});
	expect(res.status).toBe(400);
	expect((await deliver(t, "subscription.created", { status: 7 })).status).toBe(400);
});
