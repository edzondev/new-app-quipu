import assert from "node:assert/strict";
import { test } from "node:test";
import { buildContentSecurityPolicy } from "./content-security-policy.ts";

test("connect-src allows https and wss for the Convex host", () => {
	const csp = buildContentSecurityPolicy("https://happy-animal-123.convex.cloud");
	assert.match(
		csp,
		/connect-src 'self' https:\/\/happy-animal-123\.convex\.cloud wss:\/\/happy-animal-123\.convex\.cloud/,
	);
	assert.doesNotMatch(csp, /connect-src[^;]*http:/);
});

test("connect-src keeps the host when the URL has a path", () => {
	const csp = buildContentSecurityPolicy("https://dev-xyz.convex.cloud/");
	assert.match(
		csp,
		/connect-src 'self' https:\/\/dev-xyz\.convex\.cloud wss:\/\/dev-xyz\.convex\.cloud/,
	);
});
