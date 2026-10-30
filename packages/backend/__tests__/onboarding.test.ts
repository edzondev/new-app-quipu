import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";
import { splitIncome } from "../shared/budget";
import { getFirstCycleRange, getLimaDate } from "../shared/dates";

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
	todayCents: 250000,
	split: { needs: 50, wants: 30, savings: 20 },
};

const planOnly = {
	cadence: good.cadence,
	cycleStartDay: good.cycleStartDay,
	incomeCents: good.incomeCents,
};

test("anonymous gets null; new profile has no plan; complete sets plan, space and cycle", async () => {
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

	const today = getLimaDate();
	const expectedCycle = getFirstCycleRange("monthly", "last", today);
	const allocation = splitIncome(good.todayCents, good.split);
	await ana.mutation(api.profiles.completeOnboarding, good);
	expect(await ana.query(api.profiles.myProfile, {})).toEqual({
		name: "Ana",
		plan: planOnly,
	});

	const first = await t.run(async (ctx) => {
		const spaces = await ctx.db.query("spaces").take(5);
		const cycles = await ctx.db.query("cycles").take(5);
		const commitments = await ctx.db.query("commitments").take(5);
		const incomes = await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", spaces[0]._id).eq("kind", "income"))
			.take(5);
		return { spaces, cycles, commitments, incomes };
	});
	expect(first.spaces).toHaveLength(1);
	expect(first.spaces[0]).toMatchObject({ kind: "personal" });
	expect(first.cycles).toHaveLength(1);
	expect(first.cycles[0]).toMatchObject({
		spaceId: first.spaces[0]._id,
		startDate: expectedCycle.startDate,
		endDate: expectedCycle.endDate,
		split: good.split,
		envelopes: allocation,
		carryIn: { needsCents: 0, wantsCents: 0 },
	});
	expect(first.cycles[0].closedAt).toBeUndefined();
	expect(first.incomes).toHaveLength(1);
	expect(first.incomes[0]).toMatchObject({
		kind: "income",
		amountCents: good.todayCents,
		allocation,
		date: today,
	});
	expect(first.commitments).toHaveLength(0);

	// A second call does not rewrite the plan or create another space or cycle.
	await ana.mutation(api.profiles.completeOnboarding, {
		...good,
		cadence: "weekly",
		cycleStartDay: 1,
		split: { needs: 40, wants: 40, savings: 20 },
	});
	expect((await ana.query(api.profiles.myProfile, {}))?.plan).toEqual(planOnly);
	const second = await t.run(async (ctx) => {
		const spaces = await ctx.db.query("spaces").take(5);
		const cycles = await ctx.db.query("cycles").take(5);
		const commitments = await ctx.db.query("commitments").take(5);
		return {
			spaces: spaces.length,
			cycles: cycles.length,
			commitments: commitments.length,
			split: cycles[0]?.split,
		};
	});
	expect(second).toEqual({ spaces: 1, cycles: 1, commitments: 0, split: good.split });

	const luis = await signIn(t, "luis@correo.com", "Luis");
	expect(await luis.query(api.profiles.myProfile, {})).toEqual({
		name: "Luis",
		plan: null,
	});
});

test("Oct 20 with payday day 1 → cycle 20–31 with S/ 500 and plan.incomeCents 150000", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	// Lima is UTC−5; this instant is 20 Oct noon in Lima.
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const allocation = splitIncome(50_000, { needs: 50, wants: 30, savings: 20 });
	await ana.mutation(api.profiles.completeOnboarding, {
		cadence: "monthly",
		cycleStartDay: 1,
		todayCents: 50_000,
		incomeCents: 150_000,
		split: { needs: 50, wants: 30, savings: 20 },
	});

	const snap = await t.run(async (ctx) => {
		const profile = (await ctx.db.query("profiles").take(1))[0];
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		const income = (
			await ctx.db
				.query("transactions")
				.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
				.take(5)
		).find((row) => row.kind === "income");
		return { plan: profile.plan, cycle, income };
	});

	expect(snap.plan?.incomeCents).toBe(150_000);
	expect(snap.cycle).toMatchObject({
		startDate: "2026-10-20",
		endDate: "2026-10-31",
		envelopes: allocation,
	});
	expect(snap.income).toMatchObject({
		kind: "income",
		amountCents: 50_000,
		allocation,
		date: "2026-10-20",
	});
});

test("rejects invalid values", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	const bad = [
		{ ...good, incomeCents: 0 },
		{ ...good, incomeCents: -5 },
		{ ...good, incomeCents: 12.5 },
		{ ...good, incomeCents: Number.NaN },
		{ ...good, todayCents: 0 },
		{ ...good, todayCents: -5 },
		{ ...good, todayCents: 12.5 },
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
