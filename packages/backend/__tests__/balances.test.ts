import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";
import { getDailyCents, splitIncome } from "../shared/budget";
import { getPreview } from "../shared/preview";

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

const SPLIT = { needs: 50, wants: 30, savings: 20 };

test("S/ 500 at 50/30/20 with 12 days left → sobres and daily number", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	// 20–31 Oct = 12 days. S/ 500 → Needs 250, Gustos 150, Ahorro 100; diario floor(400/12).
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, {
		cadence: "monthly",
		cycleStartDay: 1,
		todayCents: 50_000,
		incomeCents: 150_000,
		split: SPLIT,
	});

	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	const share = splitIncome(50_000, SPLIT);

	expect(balances).toEqual({
		needsCents: share.needsCents, // S/ 250.00
		wantsCents: share.wantsCents, // S/ 150.00
		savingsCents: share.savingsCents, // S/ 100.00
		dailyCents: getDailyCents(share.needsCents + share.wantsCents, 12), // S/ 33.33
	});
	expect(balances).toEqual(
		getPreview({
			incomeCents: 50_000,
			commitments: [],
			split: SPLIT,
			cycleEnd: "2026-10-31",
			today: "2026-10-20",
		}),
	);
	expect(balances.dailyCents).toBe(3333);
});

test("a pending commitment lowers only the daily number", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, {
		cadence: "monthly",
		cycleStartDay: 1,
		todayCents: 50_000,
		incomeCents: 150_000,
		split: SPLIT,
	});

	await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		await ctx.db.insert("commitments", {
			spaceId: space._id,
			name: "Celular",
			amountCents: 5_000, // S/ 50
			envelope: "needs",
			frequency: "monthly",
			dueDay: 25,
		});
	});

	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(balances).toEqual(
		getPreview({
			incomeCents: 50_000,
			commitments: [{ amountCents: 5_000, dueDay: 25 }],
			split: SPLIT,
			cycleEnd: "2026-10-31",
			today: "2026-10-20",
		}),
	);
	// (250 + 150 − 50) / 12 = 29.166… → S/ 29.16
	expect(balances.dailyCents).toBe(2916);
	expect(balances.needsCents).toBe(25_000);
	expect(balances.savingsCents).toBe(10_000);
});

test("anonymous getBalances is refused", async () => {
	const t = harness();
	await expect(t.query(api.balances.getBalances, { space: "personal" })).rejects.toThrow();
});
