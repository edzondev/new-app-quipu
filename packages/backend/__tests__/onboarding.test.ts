import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");

function harness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

function post(t: ReturnType<typeof harness>, path: string, body: object) {
	return t.fetch(`/api/auth${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify(body),
	});
}

/** Sends a code and returns it (OTP_DELIVERY=log prints it instead of emailing it). */
async function sendCode(t: ReturnType<typeof harness>, email: string) {
	process.env.OTP_DELIVERY = "log";
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	const lines: string[] = [];
	const log = console.log;
	console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
	try {
		const sent = await post(t, "/email-otp/send-verification-otp", { email, type: "sign-in" });
		expect(sent.ok, await sent.clone().text()).toBe(true);
	} finally {
		console.log = log;
	}
	return lines.find((l) => l.startsWith(`OTP ${email}: `))?.slice(`OTP ${email}: `.length);
}

function findUser(t: ReturnType<typeof harness>, email: string) {
	return t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
}

async function signIn(t: ReturnType<typeof harness>, email: string, name: string) {
	const otp = await sendCode(t, email);
	const res = await post(t, "/sign-in/email-otp", { email, otp, name });
	expect(res.status, await res.clone().text()).toBe(200);
	const user = await findUser(t, email);
	const session = await t.query(components.betterAuth.adapter.findOne, {
		model: "session",
		where: [{ field: "userId", value: user._id }],
	});
	return t.withIdentity({ subject: user._id, sessionId: session._id });
}

const good = {
	cadence: "monthly" as const,
	cycleStartDay: "last" as const,
	incomeCents: 250000,
	split: { needs: 50, wants: 30, savings: 20 },
};

test("anonymous gets null; new profile has no plan; complete sets plan", async () => {
	const t = harness();
	expect(await t.query(api.profiles.myProfile, {})).toBeNull();
	await expect(t.mutation(api.profiles.completeOnboarding, good)).rejects.toThrow(
		"Unauthenticated",
	);
	const ana = await signIn(t, "ana@correo.com", "Ana");
	expect(await ana.query(api.profiles.myProfile, {})).toEqual({
		name: "Ana",
		plan: null,
	});
	await ana.mutation(api.profiles.completeOnboarding, good);
	expect(await ana.query(api.profiles.myProfile, {})).toEqual({
		name: "Ana",
		plan: good,
	});
	const luis = await signIn(t, "luis@correo.com", "Luis");
	expect(await luis.query(api.profiles.myProfile, {})).toEqual({
		name: "Luis",
		plan: null,
	});
	// idempotent: second call just overwrites
	await ana.mutation(api.profiles.completeOnboarding, {
		...good,
		cadence: "weekly",
		cycleStartDay: 1,
	});
	expect((await ana.query(api.profiles.myProfile, {}))?.plan?.cadence).toBe("weekly");
});

test("rejects invalid values", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	const bad = [
		{ ...good, incomeCents: 0 },
		{ ...good, incomeCents: -5 },
		{ ...good, incomeCents: 12.5 },
		{ ...good, incomeCents: Number.NaN },
		{ ...good, cadence: "weekly" as const, cycleStartDay: "last" as const },
		{ ...good, cadence: "weekly" as const, cycleStartDay: 7 },
		{ ...good, cycleStartDay: 0 },
		{ ...good, cycleStartDay: 32 },
		{ ...good, cadence: "biweekly" as const, cycleStartDay: 1.5 },
		{ ...good, split: { needs: 50, wants: 30, savings: 30 } },
		{ ...good, split: { needs: 120, wants: -20, savings: 0 } },
	];
	for (const args of bad) {
		await expect(
			ana.mutation(api.profiles.completeOnboarding, args),
			JSON.stringify(args),
		).rejects.toThrow();
	}
	await ana.mutation(api.profiles.completeOnboarding, {
		...good,
		split: { needs: 33.33, wants: 33.33, savings: 33.34 },
	});
	await ana.mutation(api.profiles.completeOnboarding, {
		...good,
		cadence: "biweekly",
		cycleStartDay: 15,
	});
	await ana.mutation(api.profiles.completeOnboarding, {
		...good,
		cadence: "weekly",
		cycleStartDay: 0,
	});
});

test("sign-in can't create an account: a new email without a name is refused", async () => {
	const t = harness();
	const otp = await sendCode(t, "eva@correo.com");
	const res = await post(t, "/sign-in/email-otp", { email: "eva@correo.com", otp });
	expect(res.status).toBe(400);
	expect((await res.json()).code).toBe("USER_NOT_FOUND");
	expect(await findUser(t, "eva@correo.com")).toBeNull();
});

test("a second code within 90 s is refused", async () => {
	const t = harness();
	await sendCode(t, "ana@correo.com");
	const again = await post(t, "/email-otp/send-verification-otp", {
		email: "ana@correo.com",
		type: "sign-in",
	});
	expect(again.status).toBe(429);
});
