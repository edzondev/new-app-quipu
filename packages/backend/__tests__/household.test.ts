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
	return { as: t.withIdentity({ subject: user._id, sessionId: session._id }) };
}

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: { needs: 50, wants: 30, savings: 20 },
};

test("Ana invites Luis; Luis spends; Ana cannot delete Luis's expense", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });

	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.as.mutation(api.profiles.completeOnboarding, onboard);
	await ana.as.mutation(api.household.createHousehold, { name: "Casa" });
	const { code } = await ana.as.mutation(api.household.createInvite, {});

	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.as.mutation(api.profiles.completeOnboarding, onboard);
	expect(await luis.as.mutation(api.household.joinHousehold, { code })).toEqual({ ok: true });

	await luis.as.mutation(api.transactions.addExpense, {
		space: "household",
		amountCents: 5_000,
		envelope: "needs",
	});
	const expenseId = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(5)).find((row) => row.kind === "household");
		if (!space) throw new Error("missing household");
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", space._id).eq("kind", "expense"))
			.take(5);
		return rows[0]._id;
	});

	await expect(
		ana.as.mutation(api.transactions.deleteExpense, { space: "household", id: expenseId }),
	).rejects.toThrow("Solo quien lo registró puede cambiarlo.");
});

test("six bad invite codes in a row: the sixth is rate_limited", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.as.mutation(api.profiles.completeOnboarding, onboard);

	const results = [];
	for (let i = 0; i < 6; i++) {
		results.push(await luis.as.mutation(api.household.joinHousehold, { code: "ZZZZZZ" }));
	}
	expect(results.slice(0, 5)).toEqual([
		{ ok: false, reason: "invalid" },
		{ ok: false, reason: "invalid" },
		{ ok: false, reason: "invalid" },
		{ ok: false, reason: "invalid" },
		{ ok: false, reason: "invalid" },
	]);
	expect(results[5]).toEqual({ ok: false, reason: "rate_limited" });
});
