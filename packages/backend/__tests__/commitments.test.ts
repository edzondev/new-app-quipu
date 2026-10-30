import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";
import { getDailyCents } from "../shared/budget";

afterEach(() => {
	vi.useRealTimers();
});

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

async function signIn(t: ReturnType<typeof harness>, email: string, name: string) {
	const otp = await sendCode(t, email);
	const res = await post(t, "/sign-in/email-otp", { email, otp, name });
	expect(res.status, await res.clone().text()).toBe(200);
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	const session = await t.query(components.betterAuth.adapter.findOne, {
		model: "session",
		where: [{ field: "userId", value: user._id }],
	});
	return t.withIdentity({ subject: user._id, sessionId: session._id });
}

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: { needs: 50, wants: 30, savings: 20 },
};

test("Luz S/ 50 day 25 lowers daily; markPaid cuts Needs and stops the discount", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboard);

	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Luz",
		amountCents: 5_000,
		envelope: "needs",
		schedule: { frequency: "monthly", dueDay: 25 },
	});

	const before = await ana.query(api.balances.getBalances, { space: "personal" });
	// (250 + 150 − 50) / 12
	expect(before.dailyCents).toBe(2916);
	expect(before.needsCents).toBe(25_000);

	const id = await t.run(async (ctx) => {
		const row = (await ctx.db.query("commitments").take(1))[0];
		return row._id;
	});

	await ana.mutation(api.commitments.markPaid, { space: "personal", id });

	const after = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(after.needsCents).toBe(20_000);
	expect(after.dailyCents).toBe(getDailyCents(20_000 + 15_000, 12));
	expect(after.dailyCents).toBe(2916);
});

test("once commitment paid in October cannot be marked paid again after ensureOpen in November", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboard);

	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "SOAT",
		amountCents: 5_000,
		envelope: "needs",
		schedule: { frequency: "once", dueDate: "2026-10-25" },
	});
	const id = await t.run(async (ctx) => {
		const row = (await ctx.db.query("commitments").take(1))[0];
		return row._id;
	});
	await ana.mutation(api.commitments.markPaid, { space: "personal", id });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	await expect(ana.mutation(api.commitments.markPaid, { space: "personal", id })).rejects.toThrow(
		"Este compromiso ya está pagado en este ciclo.",
	);
});
