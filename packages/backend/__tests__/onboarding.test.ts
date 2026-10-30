import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";
import { getCycleRange, getLimaDate } from "../shared/dates";
import { NOTE_MAX_LENGTH } from "../shared/budget";

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");

type CommitmentInput = { name: string; amountCents: number; dueDay: number };

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
	commitments: [] as CommitmentInput[],
};

const planOnly = {
	cadence: good.cadence,
	cycleStartDay: good.cycleStartDay,
	incomeCents: good.incomeCents,
};

test("anonymous gets null; new profile has no plan; complete sets plan, space, cycle and commitments", async () => {
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
	const expectedCycle = getCycleRange("monthly", "last", today);
	await ana.mutation(api.profiles.completeOnboarding, {
		...good,
		commitments: [{ name: "Alquiler", amountCents: 80_000, dueDay: 5 }],
	});
	expect(await ana.query(api.profiles.myProfile, {})).toEqual({
		name: "Ana",
		plan: planOnly,
	});

	const first = await t.run(async (ctx) => {
		const spaces = await ctx.db.query("spaces").take(5);
		const cycles = await ctx.db.query("cycles").take(5);
		const commitments = await ctx.db.query("commitments").take(5);
		return { spaces, cycles, commitments };
	});
	expect(first.spaces).toHaveLength(1);
	expect(first.spaces[0]).toMatchObject({ kind: "personal" });
	expect(first.cycles).toHaveLength(1);
	expect(first.cycles[0]).toMatchObject({
		spaceId: first.spaces[0]._id,
		startDate: expectedCycle.startDate,
		endDate: expectedCycle.endDate,
		split: good.split,
		envelopes: { needsCents: 0, wantsCents: 0, savingsCents: 0 },
		carryIn: { needsCents: 0, wantsCents: 0 },
	});
	expect(first.cycles[0].closedAt).toBeUndefined();
	expect(first.commitments).toHaveLength(1);
	expect(first.commitments[0]).toMatchObject({
		spaceId: first.spaces[0]._id,
		name: "Alquiler",
		amountCents: 80_000,
		dueDay: 5,
		frequency: "monthly",
		envelope: "needs",
	});

	// A second call does not rewrite the plan or create another space or cycle.
	await ana.mutation(api.profiles.completeOnboarding, {
		...good,
		cadence: "weekly",
		cycleStartDay: 1,
		split: { needs: 40, wants: 40, savings: 20 },
		commitments: [],
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
	expect(second).toEqual({ spaces: 1, cycles: 1, commitments: 1, split: good.split });

	const luis = await signIn(t, "luis@correo.com", "Luis");
	expect(await luis.query(api.profiles.myProfile, {})).toEqual({
		name: "Luis",
		plan: null,
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
		{ ...good, cadence: "weekly" as const, cycleStartDay: "last" as const },
		{ ...good, cadence: "weekly" as const, cycleStartDay: 7 },
		{ ...good, cycleStartDay: 0 },
		{ ...good, cycleStartDay: 32 },
		{ ...good, cadence: "biweekly" as const, cycleStartDay: 1.5 },
		{ ...good, split: { needs: 50, wants: 30, savings: 30 } },
		{ ...good, split: { needs: 120, wants: -20, savings: 0 } },
		{
			...good,
			commitments: [{ name: "x".repeat(NOTE_MAX_LENGTH + 1), amountCents: 1000, dueDay: 5 }],
		},
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
