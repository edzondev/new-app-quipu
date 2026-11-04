import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";

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

test("saving S/ 100 to Viaje a Cusco then deleting the goal moves it to the fund", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboard);

	await ana.mutation(api.goals.add, {
		space: "personal",
		name: "Viaje a Cusco",
		targetCents: 500_000,
	});
	const goalId = await t.run(async (ctx) => {
		const goal = (await ctx.db.query("goals").take(1))[0];
		return goal._id;
	});

	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 10_000,
		goalId,
	});

	const listed = await ana.query(api.goals.list, { space: "personal" });
	expect(listed).toEqual([
		{
			id: goalId,
			name: "Viaje a Cusco",
			targetCents: 500_000,
			targetMonth: null,
			savedCents: 10_000,
		},
	]);

	await ana.mutation(api.goals.remove, { space: "personal", id: goalId });

	const fundCents = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return space.fundCents;
	});
	expect(fundCents).toBe(10_000);
	expect(await ana.query(api.goals.list, { space: "personal" })).toEqual([]);
});

async function anaOnOct20(t: ReturnType<typeof harness>) {
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboard);
	return ana;
}

test("saving S/ 50 and setting the goal to S/ 4,200 shows the fund and its goal", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 5_000 });
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 420_000 });

	expect(await ana.query(api.goals.fund, { space: "personal" })).toEqual({
		fundCents: 5_000,
		fundGoalCents: 420_000,
	});
});

test("without a fund goal, fund reads fundGoalCents as null", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);

	expect(await ana.query(api.goals.fund, { space: "personal" })).toEqual({
		fundCents: 0,
		fundGoalCents: null,
	});
});

test("setting the fund goal again replaces it", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 420_000 });
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 600_000 });

	const { fundGoalCents } = await ana.query(api.goals.fund, { space: "personal" });
	expect(fundGoalCents).toBe(600_000);
});

test("a fund goal of 0, negative or with decimals fails and keeps the old one", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 420_000 });

	for (const targetCents of [0, -100, 100.5]) {
		await expect(
			ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents }),
		).rejects.toThrow("Revisa los datos e inténtalo otra vez.");
	}

	const { fundGoalCents } = await ana.query(api.goals.fund, { space: "personal" });
	expect(fundGoalCents).toBe(420_000);
});

test("in a household only who created it sets the fund goal; both read it", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.household.createHousehold, { name: "Casa" });
	const { code } = await ana.mutation(api.household.createInvite, {});
	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, onboard);
	await luis.mutation(api.household.joinHousehold, { code });

	await expect(
		luis.mutation(api.goals.setFundGoal, { space: "household", targetCents: 420_000 }),
	).rejects.toThrow("Solo quien creó el hogar define la meta del fondo.");
	await ana.mutation(api.goals.setFundGoal, { space: "household", targetCents: 420_000 });

	for (const member of [ana, luis]) {
		const { fundGoalCents } = await member.query(api.goals.fund, { space: "household" });
		expect(fundGoalCents).toBe(420_000);
	}
});
