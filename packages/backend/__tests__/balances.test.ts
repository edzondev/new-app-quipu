import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";
import { getDailyCents, splitIncome } from "../shared/budget";

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

const onboardOct20 = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: SPLIT,
};

test("S/ 500 at 50/30/20 with 12 days left → sobres and daily number", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	// 20–31 Oct = 12 days. S/ 500 → Needs 250, Gustos 150, Ahorro 100; diario floor(400/12).
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);

	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	const share = splitIncome(50_000, SPLIT);

	expect(balances).toEqual({
		needsCents: share.needsCents, // S/ 250.00
		wantsCents: share.wantsCents, // S/ 150.00
		savingsCents: share.savingsCents, // S/ 100.00
		dailyCents: getDailyCents(share.needsCents + share.wantsCents, 12), // S/ 33.33
	});
	expect(balances.dailyCents).toBe(3333);
});

test("a pending commitment lowers only the daily number", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);

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
	// (250 + 150 − 50) / 12 = 29.166… → S/ 29.16
	expect(balances.dailyCents).toBe(2916);
	expect(balances.needsCents).toBe(25_000);
	expect(balances.savingsCents).toBe(10_000);
});

test("after close, balances come from carryIn envelopes even with no new income", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	// Ahorro went to the fund; Needs/Wants carried in. Nov has 30 days.
	expect(balances).toEqual({
		needsCents: 25_000,
		wantsCents: 15_000,
		savingsCents: 0,
		dailyCents: getDailyCents(25_000 + 15_000, 30),
	});
	expect(balances.dailyCents).toBe(1333);
});

test("anonymous getBalances is refused", async () => {
	const t = harness();
	await expect(t.query(api.balances.getBalances, { space: "personal" })).rejects.toThrow();
});

test("getHome with a later today shrinks daysLeft and raises dailyCents", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);

	const day20 = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	const day26 = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-26" });
	const share = splitIncome(50_000, SPLIT);
	const free = share.needsCents + share.wantsCents;

	expect(day20.daysLeft).toBe(12);
	expect(day20.dailyCents).toBe(getDailyCents(free, 12));
	expect(day26.daysLeft).toBe(6);
	expect(day26.dailyCents).toBe(getDailyCents(free, 6));
	expect(day26.dailyCents).toBeGreaterThan(day20.dailyCents);
	expect(day20.empty).toBe(false);
	expect(day20.planIncomeCents).toBe(150_000);
});

test("getHome is not empty when income exists but every envelope is at 0", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);

	const share = splitIncome(50_000, SPLIT);
	const goalId = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return ctx.db.insert("goals", { spaceId: space._id, name: "Viaje", targetCents: 100_000 });
	});
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: share.needsCents,
		envelope: "needs",
	});
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: share.wantsCents,
		envelope: "wants",
	});
	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: share.savingsCents,
		goalId,
	});

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect([home.needsCents, home.wantsCents, home.savingsCents]).toEqual([0, 0, 0]);
	expect(home.empty).toBe(false);
});

test("getHome is not empty on a new cycle with carry but no income", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	// Needs 250 + Gustos 150 carried in from October, nothing earned in November.
	expect(home.needsCents + home.wantsCents).toBe(40_000);
	expect(home.empty).toBe(false);
	expect(home.assigned).toEqual({ needsCents: 25_000, wantsCents: 15_000, savingsCents: 0 });
});

test("assigned is never negative when the cycle opens with a negative carry", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);
	// Needs got S/ 250; spending S/ 300 leaves it at −S/ 50 when October closes.
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 30_000,
		envelope: "needs",
	});

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	expect(home.needsCents).toBe(-5_000);
	expect(home.assigned).toEqual({ needsCents: 0, wantsCents: 15_000, savingsCents: 0 });
});

test("getHome returns the dates of the open cycle", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(home.startDate).toBe("2026-10-20");
	expect(home.endDate).toBe("2026-10-31");
});

test("assigned is what the cycle received and does not drop when you spend", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
	});

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(home.needsCents).toBe(20_000);
	expect(home.assigned).toEqual({ needsCents: 25_000, wantsCents: 15_000, savingsCents: 10_000 });
});

test("assigned adds the share of each income, like the envelopes do", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);
	// 3 cents split 50/30/20 give Gustos 0 each time; one sum of 6 cents would give it 1.
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 3 });
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 3 });

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(home.assigned).toEqual({
		needsCents: home.needsCents,
		wantsCents: home.wantsCents,
		savingsCents: home.savingsCents,
	});
	expect(home.assigned.wantsCents).toBe(15_000);
});

test("assigned drops when an income is deleted", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboardOct20);
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 20_000 });
	const args = { space: "personal" as const, today: "2026-10-20" };

	const before = await ana.query(api.balances.getHome, args);
	expect(before.assigned.needsCents).toBe(35_000);

	const list = await ana.query(api.transactions.list, args);
	const extra = list.rows.filter((row) => row.kind === "income" && row.amountCents === 20_000)[0];
	await ana.mutation(api.transactions.deleteIncome, { space: "personal", id: extra.id });

	const after = await ana.query(api.balances.getHome, args);
	expect(after.assigned.needsCents).toBe(25_000);
});

test("getHome is empty with no income and nothing carried", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, todayCents: 0 });

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(home.empty).toBe(true);
});
