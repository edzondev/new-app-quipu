import polarTest from "@convex-dev/polar/test";
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
	polarTest.register(t);
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

const TODAY = "2026-10-20";

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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Ana" });

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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Ana" });
	return ana;
}

test("saving S/ 50 and setting the goal to S/ 4,200 shows the fund and its goal", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 5_000 });
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 420_000 });

	expect(await ana.query(api.goals.fund, { space: "personal", today: TODAY })).toEqual({
		fundCents: 5_000,
		fundGoalCents: 420_000,
		suggestedFundGoalCents: 225_000,
	});
});

test("without a fund goal, fund reads fundGoalCents as null", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);

	expect(await ana.query(api.goals.fund, { space: "personal", today: TODAY })).toEqual({
		fundCents: 0,
		fundGoalCents: null,
		suggestedFundGoalCents: 225_000,
	});
});

test("removing the fund goal keeps the money in the fund", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 5_000 });
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 420_000 });

	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: null });

	expect(await ana.query(api.goals.fund, { space: "personal", today: TODAY })).toEqual({
		fundCents: 5_000,
		fundGoalCents: null,
		suggestedFundGoalCents: 225_000,
	});
});

test("after removing the fund goal, a new one can be set", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 420_000 });
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: null });
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 600_000 });

	const { fundGoalCents } = await ana.query(api.goals.fund, { space: "personal", today: TODAY });
	expect(fundGoalCents).toBe(600_000);
});

test("setting the fund goal again replaces it", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 420_000 });
	await ana.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 600_000 });

	const { fundGoalCents } = await ana.query(api.goals.fund, { space: "personal", today: TODAY });
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

	const { fundGoalCents } = await ana.query(api.goals.fund, { space: "personal", today: TODAY });
	expect(fundGoalCents).toBe(420_000);
});

async function householdPair() {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.profiles.startTrial, {});
	await ana.mutation(api.household.createHousehold, { name: "Casa" });
	const { code } = await ana.mutation(api.household.createInvite, {});
	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Luis" });
	await luis.mutation(api.household.joinHousehold, { code });
	return { ana, luis };
}

test("in a household both set, change and remove the fund goal, and both read it", async () => {
	const { ana, luis } = await householdPair();

	await luis.mutation(api.goals.setFundGoal, { space: "household", targetCents: 420_000 });
	for (const member of [ana, luis]) {
		const { fundGoalCents } = await member.query(api.goals.fund, {
			space: "household",
			today: TODAY,
		});
		expect(fundGoalCents).toBe(420_000);
	}

	await ana.mutation(api.goals.setFundGoal, { space: "household", targetCents: 500_000 });
	await luis.mutation(api.goals.setFundGoal, { space: "household", targetCents: null });
	for (const member of [ana, luis]) {
		const { fundGoalCents } = await member.query(api.goals.fund, {
			space: "household",
			today: TODAY,
		});
		expect(fundGoalCents).toBeNull();
	}
});

test("editing a goal without a month removes its month; with a month sets it", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.goals.add, {
		space: "personal",
		name: "Viaje a Cusco",
		targetCents: 500_000,
		targetMonth: "2027-03",
	});
	const [goal] = await ana.query(api.goals.list, { space: "personal" });
	expect(goal.targetMonth).toBe("2027-03");

	await ana.mutation(api.goals.update, {
		space: "personal",
		id: goal.id,
		name: "Viaje a Cusco",
		targetCents: 600_000,
	});
	const [withoutMonth] = await ana.query(api.goals.list, { space: "personal" });
	expect(withoutMonth).toMatchObject({ targetCents: 600_000, targetMonth: null });

	await ana.mutation(api.goals.update, {
		space: "personal",
		id: goal.id,
		name: "Viaje a Cusco",
		targetCents: 600_000,
		targetMonth: "2027-05",
	});
	const [withMonth] = await ana.query(api.goals.list, { space: "personal" });
	expect(withMonth.targetMonth).toBe("2027-05");
});

test("a goal month that is not 01-12 fails on add and update and keeps the old month", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.goals.add, {
		space: "personal",
		name: "Viaje a Cusco",
		targetCents: 500_000,
		targetMonth: "2027-03",
	});
	const [goal] = await ana.query(api.goals.list, { space: "personal" });

	for (const targetMonth of ["2027-13", "2027-00"]) {
		await expect(
			ana.mutation(api.goals.add, {
				space: "personal",
				name: "Laptop nueva",
				targetCents: 350_000,
				targetMonth,
			}),
		).rejects.toThrow("Revisa los datos e inténtalo otra vez.");
		await expect(
			ana.mutation(api.goals.update, {
				space: "personal",
				id: goal.id,
				name: "Viaje a Cusco",
				targetCents: 500_000,
				targetMonth,
			}),
		).rejects.toThrow("Revisa los datos e inténtalo otra vez.");
	}

	const goals = await ana.query(api.goals.list, { space: "personal" });
	expect(goals).toHaveLength(1);
	expect(goals[0].targetMonth).toBe("2027-03");
});

async function suggestedFor(plan: {
	cadence?: "monthly" | "biweekly" | "weekly";
	cycleStartDay?: number;
	incomeCents?: number;
}) {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, { name: "Ana", ...onboard, ...plan });
	return (await ana.query(api.goals.fund, { space: "personal", today: TODAY }))
		.suggestedFundGoalCents;
}

test("monthly S/ 3,600 at 50% Needs suggests 3 months: S/ 5,400", async () => {
	expect(await suggestedFor({ incomeCents: 360_000 })).toBe(540_000);
});

test("biweekly income counts twice a month", async () => {
	expect(await suggestedFor({ cadence: "biweekly", incomeCents: 200_000 })).toBe(600_000);
});

test("weekly income counts 52/12 a month and rounds down to the cent", async () => {
	expect(await suggestedFor({ cadence: "weekly", cycleStartDay: 1, incomeCents: 100_001 })).toBe(
		650_006,
	);
});

test("without a usual income there is no suggestion, not S/ 0", async () => {
	expect(await suggestedFor({ incomeCents: undefined })).toBeNull();
});

test("without an open cycle for today there is no suggestion", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);

	const fund = await ana.query(api.goals.fund, { space: "personal", today: "2026-12-01" });
	expect(fund.suggestedFundGoalCents).toBeNull();
});

test("without a plan there is no suggestion, and the fund still reads", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await t.run(async (ctx) => {
		const profile = await ctx.db.query("profiles").first();
		if (!profile) throw new Error("missing profile");
		await ctx.db.patch("profiles", profile._id, { plan: undefined });
	});

	expect(await ana.query(api.goals.fund, { space: "personal", today: TODAY })).toEqual({
		fundCents: 0,
		fundGoalCents: null,
		suggestedFundGoalCents: null,
	});
});

// A household has no usual income of its own, and copying the creator's would leak a personal figure.
test("in a household there is no fund goal suggestion", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.profiles.startTrial, {});
	await ana.mutation(api.household.createHousehold, { name: "Casa" });

	const household = await ana.query(api.goals.fund, { space: "household", today: TODAY });
	const personal = await ana.query(api.goals.fund, { space: "personal", today: TODAY });
	expect(household.suggestedFundGoalCents).toBeNull();
	expect(personal.suggestedFundGoalCents).toBe(225_000);
});

test("fund with a date that is not a date fails", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);

	await expect(ana.query(api.goals.fund, { space: "personal", today: "hoy" })).rejects.toThrow(
		"Revisa los datos e inténtalo otra vez.",
	);
});

test("a day that does not exist on the calendar fails as today and as a commitment due date", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);

	for (const date of ["2026-02-30", "2026-02-29", "2026-04-31", "2026-11-31"]) {
		await expect(ana.query(api.goals.fund, { space: "personal", today: date })).rejects.toThrow(
			"Revisa los datos e inténtalo otra vez.",
		);
		await expect(
			ana.mutation(api.commitments.add, {
				space: "personal",
				name: "SOAT",
				amountCents: 6_000,
				envelope: "needs",
				schedule: { frequency: "once", dueDate: date },
			}),
		).rejects.toThrow("Revisa los datos e inténtalo otra vez.");
	}

	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "SOAT",
		amountCents: 6_000,
		envelope: "needs",
		schedule: { frequency: "once", dueDate: "2028-02-29" },
	});
});

test("a goal name counts its length after trimming: 40 characters save, 41 or blank fail", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const name = "a".repeat(40);
	const goal = { space: "personal" as const, targetCents: 100_000 };

	await ana.mutation(api.goals.add, { ...goal, name: `  ${name}  ` });
	for (const bad of [`${name}a`, "   ", ""]) {
		await expect(ana.mutation(api.goals.add, { ...goal, name: bad })).rejects.toThrow(
			"Revisa los datos e inténtalo otra vez.",
		);
	}

	const goals = await ana.query(api.goals.list, { space: "personal" });
	expect(goals.map((item) => item.name)).toEqual([name]);
});
