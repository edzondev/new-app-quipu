import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");
const cloudUrl = process.env.CONVEX_CLOUD_URL;

afterEach(() => {
	if (cloudUrl === undefined) delete process.env.CONVEX_CLOUD_URL;
	else process.env.CONVEX_CLOUD_URL = cloudUrl;
});

function testHarness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

test("creating an account leaves the profile on step 1", async () => {
	delete process.env.RESEND_API_KEY;
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	const t = testHarness();
	const email = "ana@correo.com";
	expect(await t.query(api.profiles.myProfile, {})).toBeNull();

	const lines: string[] = [];
	const write = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.map(String).join(" "));
	};
	try {
		const sent = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: { "content-type": "application/json", origin: "http://localhost:3000" },
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
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify({ email, otp, name: "Ana" }),
	});
	expect(signedIn.status, await signedIn.clone().text()).toBe(200);

	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	const session = await t.query(components.betterAuth.adapter.findOne, {
		model: "session",
		where: [{ field: "userId", value: user._id }],
	});
	const asUser = t.withIdentity({ subject: user._id, sessionId: session._id });
	const created = await asUser.query(api.profiles.myProfile, {});
	expect(created?.name).toBe("Ana");
	expect(created?.currentStep).toBe("step-1");
});
