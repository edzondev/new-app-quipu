import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterAll, afterEach, expect, test } from "vitest";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";

const site = "http://quipu.test";
process.env.SITE_URL = site;

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");
const cloudUrl = process.env.CONVEX_CLOUD_URL;

afterEach(() => {
	if (cloudUrl === undefined) delete process.env.CONVEX_CLOUD_URL;
	else process.env.CONVEX_CLOUD_URL = cloudUrl;
});

afterAll(() => {
	delete process.env.SITE_URL;
});

function testHarness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

test("creating a passkey requires a session", async () => {
	const t = testHarness();
	const response = await t.fetch("/api/auth/passkey/generate-register-options", {
		method: "GET",
		headers: { origin: site },
	});
	expect(response.status).toBe(401);
	expect((await response.json()).code).toBe("UNAUTHORIZED");
});

test("with a session the passkey announces the site domain and Quipu name", async () => {
	delete process.env.RESEND_API_KEY;
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	process.env.SITE_URL = site;
	const t = testHarness();
	const email = "ana@correo.com";
	const lines: string[] = [];
	const write = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.map(String).join(" "));
	};
	try {
		const sent = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: { "content-type": "application/json", origin: site },
			body: JSON.stringify({ email, type: "sign-in" }),
		});
		expect(sent.ok, await sent.clone().text()).toBe(true);
	} finally {
		console.log = write;
	}
	const line = lines.find((text) => text.startsWith("[dev] Code for "));
	const otp = line?.slice("[dev] Code for ".length + email.length + 2);
	const signedIn = await t.fetch("/api/auth/sign-in/email-otp", {
		method: "POST",
		headers: { "content-type": "application/json", origin: site },
		body: JSON.stringify({ email, otp, name: "Ana" }),
	});
	expect(signedIn.status, await signedIn.clone().text()).toBe(200);
	const cookie = signedIn.headers
		.getSetCookie()
		.map((part) => part.split(";")[0])
		.join("; ");
	const options = await t.fetch("/api/auth/passkey/generate-register-options", {
		method: "GET",
		headers: { origin: site, cookie },
	});
	expect(options.status, await options.clone().text()).toBe(200);
	const body = await options.json();
	expect(body.rp.id).toBe("quipu.test");
	expect(body.rp.name).toBe("Quipu");
});
