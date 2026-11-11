import { expect, test } from "vitest";
import { verifyWebhook } from "../convex/model/polarWebhook";

// Reference vector made with the official `standardwebhooks` package.
const secret = "whsec_cXVpcHUtdGVzdC1zZWNyZXQtMDEyMzQ1Njc4OWFiY2Q=";
const body = '{"type":"product.updated","data":{"id":"p1"}}';
const timestamp = 1_760_000_000;
const signature = "v1,scRAk43lxUFyeclaIihHTllHSsVCkdaE0d03uI/G9GA=";
const now = timestamp * 1000;

function headers(over: Record<string, string> = {}) {
	return new Headers({
		"webhook-id": "msg_test_1",
		"webhook-timestamp": String(timestamp),
		"webhook-signature": signature,
		...over,
	});
}

test("a valid signature passes", async () => {
	expect(await verifyWebhook(secret, headers(), body, now)).toBe(true);
});

test("the secret works with or without the whsec_ prefix", async () => {
	expect(await verifyWebhook(secret.slice(6), headers(), body, now)).toBe(true);
});

test("a wrong signature, secret or body fails", async () => {
	const bad = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
	expect(await verifyWebhook(secret, headers({ "webhook-signature": bad }), body, now)).toBe(false);
	const other = `whsec_${btoa("other-secret-0123456789abcdefgh")}`;
	expect(await verifyWebhook(other, headers(), body, now)).toBe(false);
	expect(await verifyWebhook(secret, headers(), `${body} `, now)).toBe(false);
});

test("any of several signatures may match (key rotation), but only v1", async () => {
	const rotated = `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ${signature}`;
	expect(await verifyWebhook(secret, headers({ "webhook-signature": rotated }), body, now)).toBe(
		true,
	);
	const wrongVersion = signature.replace("v1,", "v2,");
	expect(
		await verifyWebhook(secret, headers({ "webhook-signature": wrongVersion }), body, now),
	).toBe(false);
});

test("a timestamp more than 5 minutes off fails, in either direction", async () => {
	expect(await verifyWebhook(secret, headers(), body, now + 299_000)).toBe(true);
	expect(await verifyWebhook(secret, headers(), body, now + 301_000)).toBe(false);
	expect(await verifyWebhook(secret, headers(), body, now - 301_000)).toBe(false);
});

test("a missing header or a bad timestamp fails", async () => {
	for (const name of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
		const incomplete = headers();
		incomplete.delete(name);
		expect(await verifyWebhook(secret, incomplete, body, now)).toBe(false);
	}
	expect(await verifyWebhook(secret, headers({ "webhook-timestamp": "soon" }), body, now)).toBe(
		false,
	);
});
