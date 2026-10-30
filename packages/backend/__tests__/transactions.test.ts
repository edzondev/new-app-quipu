import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";
import { splitIncome } from "../shared/budget";

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

const SPLIT = { needs: 50, wants: 30, savings: 20 };
const SPLIT_40 = { needs: 40, wants: 40, savings: 20 };

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: SPLIT,
};

async function anaOnOct20(t: ReturnType<typeof harness>) {
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.as.mutation(api.profiles.completeOnboarding, onboard);
	return ana;
}

async function expenseId(t: ReturnType<typeof harness>) {
	return t.run(async (ctx) => {
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.take(20);
		const expense = rows.find((row) => row.kind === "expense");
		if (!expense) throw new Error("missing expense");
		return expense._id;
	});
}

async function incomeId(t: ReturnType<typeof harness>, amountCents: number) {
	return t.run(async (ctx) => {
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.take(20);
		const income = rows.find((row) => row.kind === "income" && row.amountCents === amountCents);
		if (!income) throw new Error("missing income");
		return income._id;
	});
}

test("whitespace-only note stores the expense without note", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
		note: "   ",
	});
	const row = await t.run(async (ctx) => {
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.take(20);
		return rows.find((r) => r.kind === "expense");
	});
	expect(row).toMatchObject({ kind: "expense", amountCents: 5_000, envelope: "needs" });
	expect(row?.note).toBeUndefined();
});

test("edit expense S/ 50 Needs → S/ 80 Wants restores Needs and lowers Wants", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
	});
	const id = await expenseId(t);
	await ana.as.mutation(api.transactions.updateExpense, {
		space: "personal",
		id,
		amountCents: 8_000,
		envelope: "wants",
	});
	const balances = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(balances.needsCents).toBe(25_000);
	expect(balances.wantsCents).toBe(7_000);
});

test("delete expense returns the amount to its envelope", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
	});
	const id = await expenseId(t);
	await ana.as.mutation(api.transactions.deleteExpense, { space: "personal", id });
	const balances = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(balances.needsCents).toBe(25_000);
});

test("Luis cannot edit or delete Ana's expense", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
	});
	const id = await expenseId(t);

	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.as.mutation(api.profiles.completeOnboarding, onboard);

	await expect(
		luis.as.mutation(api.transactions.updateExpense, {
			space: "personal",
			id,
			amountCents: 1_000,
			envelope: "needs",
		}),
	).rejects.toThrow("No encontramos este dato.");
	await expect(
		luis.as.mutation(api.transactions.deleteExpense, { space: "personal", id }),
	).rejects.toThrow("No encontramos este dato.");

	const balances = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(balances.needsCents).toBe(20_000);
});

test("income S/ 100 splits 50/30/20; deleting it reverts the stored allocation after a split change", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const afterAdd = await ana.as.query(api.balances.getBalances, { space: "personal" });
	const share = splitIncome(10_000, SPLIT);
	expect(afterAdd).toMatchObject({
		needsCents: 25_000 + share.needsCents,
		wantsCents: 15_000 + share.wantsCents,
		savingsCents: 10_000 + share.savingsCents,
	});

	const id = await incomeId(t, 10_000);
	await t.run(async (ctx) => {
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		await ctx.db.patch("cycles", cycle._id, { split: SPLIT_40 });
	});

	await ana.as.mutation(api.transactions.deleteIncome, { space: "personal", id });
	const afterDelete = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(afterDelete).toMatchObject({
		needsCents: 25_000,
		wantsCents: 15_000,
		savingsCents: 10_000,
	});
});

test("saving S/ 100 empties Ahorro; S/ 101 fails; withdraw over fund fails", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);

	await expect(
		ana.as.mutation(api.transactions.addSaving, {
			space: "personal",
			amountCents: 10_100,
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	await ana.as.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 10_000,
	});
	const afterSave = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(afterSave.savingsCents).toBe(0);

	await expect(
		ana.as.mutation(api.transactions.withdrawSaving, {
			space: "personal",
			amountCents: 10_100,
			envelope: "needs",
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	await ana.as.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 10_000,
		envelope: "needs",
	});
	const afterWithdraw = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(afterWithdraw.needsCents).toBe(35_000);
	expect(afterWithdraw.savingsCents).toBe(0);
});

test("updateIncome S/ 100 → S/ 200 updates envelopes to the new split", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const id = await incomeId(t, 10_000);
	await ana.as.mutation(api.transactions.updateIncome, {
		space: "personal",
		id,
		amountCents: 20_000,
	});
	const share = splitIncome(20_000, SPLIT);
	const balances = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(balances).toMatchObject({
		needsCents: 25_000 + share.needsCents,
		wantsCents: 15_000 + share.wantsCents,
		savingsCents: 10_000 + share.savingsCents,
	});
});

test("deleteIncome fails if that income's Ahorro was already moved to the fund", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const id = await incomeId(t, 10_000);
	await ana.as.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 12_000,
	});

	await expect(
		ana.as.mutation(api.transactions.deleteIncome, { space: "personal", id }),
	).rejects.toThrow("Ya usaste parte de este ingreso en tu ahorro. Retíralo primero.");

	const fundCents = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return space.fundCents;
	});
	expect(fundCents).toBe(12_000);
});
