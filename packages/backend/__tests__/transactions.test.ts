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
			reason: "other",
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	await ana.as.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 10_000,
		reason: "other",
	});
	const afterWithdraw = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(afterWithdraw.needsCents).toBe(35_000);
	expect(afterWithdraw.savingsCents).toBe(0);
});

async function anaWithFund(t: ReturnType<typeof harness>) {
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addSaving, { space: "personal", amountCents: 10_000 });
	return ana;
}

function readFundCents(t: ReturnType<typeof harness>) {
	return t.run(async (ctx) => (await ctx.db.query("spaces").take(1))[0].fundCents);
}

test("withdrawing S/ 100 as emergency raises Necesidades 10000 and empties the fund", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });

	await ana.as.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 10_000,
		reason: "emergency",
	});

	const after = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(after.needsCents).toBe(before.needsCents + 10_000);
	expect(after.wantsCents).toBe(before.wantsCents);
	expect(await readFundCents(t)).toBe(0);
	const withdrawal = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", space._id).eq("kind", "withdrawal"))
			.take(5);
		return rows[0];
	});
	expect(withdrawal).toMatchObject({
		kind: "withdrawal",
		reason: "emergency",
		amountCents: 10_000,
	});
});

test("a withdrawal without a reason fails and moves nothing", async () => {
	const t = harness();
	const ana = await anaWithFund(t);

	await expect(
		// @ts-expect-error reason is required
		ana.as.mutation(api.transactions.withdrawSaving, { space: "personal", amountCents: 10_000 }),
	).rejects.toThrow();

	expect(await readFundCents(t)).toBe(10_000);
});

test("a withdrawal with an unknown reason fails and moves nothing", async () => {
	const t = harness();
	const ana = await anaWithFund(t);

	await expect(
		ana.as.mutation(api.transactions.withdrawSaving, {
			space: "personal",
			amountCents: 10_000,
			// @ts-expect-error not one of the allowed reasons
			reason: "vacation",
		}),
	).rejects.toThrow();

	expect(await readFundCents(t)).toBe(10_000);
});

test("withdrawing from an empty fund fails and changes nothing", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });

	await expect(
		ana.as.mutation(api.transactions.withdrawSaving, {
			space: "personal",
			amountCents: 100,
			reason: "emergency",
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toEqual(before);
	expect(await readFundCents(t)).toBe(0);
});

test("el segundo retiro que pasa el fondo falla y no cambia nada", async () => {
	const t = harness();
	const ana = await anaWithFund(t);

	await ana.as.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 6_000,
		reason: "emergency",
	});
	const afterFirst = await ana.as.query(api.balances.getBalances, { space: "personal" });

	await expect(
		ana.as.mutation(api.transactions.withdrawSaving, {
			space: "personal",
			amountCents: 6_000,
			reason: "emergency",
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toEqual(afterFirst);
	expect(await readFundCents(t)).toBe(4_000);
});

test("a withdrawal raises the amount you can spend today", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	const args = { space: "personal" as const, today: "2026-10-20" };
	const before = await ana.as.query(api.balances.getHome, args);

	await ana.as.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 10_000,
		reason: "emergency",
	});

	const after = await ana.as.query(api.balances.getHome, args);
	expect(after.dailyCents).toBeGreaterThan(before.dailyCents);
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

test("updateIncome S/ 100 → S/ 200 after saving S/ 120 still covers the old Ahorro share", async () => {
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
		savingsCents: 10_000 + share.savingsCents - 12_000,
	});
});

test("updateIncome S/ 100 → S/ 50 fails after saving S/ 120 from that income's Ahorro", async () => {
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
		ana.as.mutation(api.transactions.updateIncome, {
			space: "personal",
			id,
			amountCents: 5_000,
		}),
	).rejects.toThrow("Ya usaste parte de este ingreso en tu ahorro. Retíralo primero.");
});

test("list returns the open cycle newest first and leaves out the other cycle", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 1_000,
		envelope: "needs",
	});
	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 2_000,
		envelope: "wants",
	});

	const october = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-20",
	});
	expect(october.rows.map((row) => row.amountCents)).toEqual([2_000, 1_000, 50_000]);
	expect(october.rows.every((row) => row.who === null)).toBe(true);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 3_000,
		envelope: "needs",
	});

	const november = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-11-01",
	});
	expect(november.rows.map((row) => row.amountCents)).toEqual([3_000]);
});

test("list in household is newest first with mine and author who", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });

	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.as.mutation(api.profiles.completeOnboarding, onboard);
	await ana.as.mutation(api.household.createHousehold, { name: "Casa" });
	const { code } = await ana.as.mutation(api.household.createInvite, {});

	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.as.mutation(api.profiles.completeOnboarding, onboard);
	expect(await luis.as.mutation(api.household.joinHousehold, { code })).toEqual({ ok: true });

	await ana.as.mutation(api.transactions.addExpense, {
		space: "household",
		amountCents: 1_000,
		envelope: "needs",
	});
	await luis.as.mutation(api.transactions.addExpense, {
		space: "household",
		amountCents: 2_000,
		envelope: "wants",
	});

	const list = await ana.as.query(api.transactions.list, {
		space: "household",
		today: "2026-10-20",
	});
	expect(list.rows.map((row) => row.amountCents)).toEqual([2_000, 1_000]);
	expect(list.rows.map((row) => ({ mine: row.mine, who: row.who }))).toEqual([
		{ mine: false, who: "Luis" },
		{ mine: true, who: "Ana" },
	]);
});

test("updateIncome S/ 100 → S/ 200 then deleteIncome restores envelopes from before the income", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });
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
	await ana.as.mutation(api.transactions.deleteIncome, { space: "personal", id });
	const after = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(after).toMatchObject({
		needsCents: before.needsCents,
		wantsCents: before.wantsCents,
		savingsCents: before.savingsCents,
	});
});

test("one cent more than Ahorro or than the fund fails and changes nothing", async () => {
	const t = harness();
	const ana = await anaWithFund(t);

	await expect(
		ana.as.mutation(api.transactions.addSaving, { space: "personal", amountCents: 1 }),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");
	await expect(
		ana.as.mutation(api.transactions.withdrawSaving, {
			space: "personal",
			amountCents: 10_001,
			reason: "other",
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	expect(await readFundCents(t)).toBe(10_000);
});

test("a note counts its length after trimming: 40 characters save, 41 fail", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const note = "n".repeat(40);

	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
		note: `  ${note}  `,
	});
	await expect(
		ana.as.mutation(api.transactions.addExpense, {
			space: "personal",
			amountCents: 5_000,
			envelope: "needs",
			note: `${note}n`,
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-20",
	});
	expect(rows.filter((row) => row.kind === "expense").map((row) => row.note)).toEqual([note]);
});

test("an Extra Bono of S/ 200 straight to Ahorro leaves the number of the day unchanged", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });

	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 20_000,
		extra: { type: "bonus", toSavings: true },
	});

	const after = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(after).toEqual({ ...before, savingsCents: before.savingsCents + 20_000 });
});

test("an Extra Bono of S/ 200 to the envelopes splits 50/30/20 and raises the number of the day", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });

	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 20_000,
		extra: { type: "bonus", toSavings: false },
	});

	const after = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(after).toMatchObject({
		needsCents: before.needsCents + 10_000,
		wantsCents: before.wantsCents + 6_000,
		savingsCents: before.savingsCents + 4_000,
	});
	expect(after.dailyCents).toBeGreaterThan(before.dailyCents);
});

test("list marks an Extra and leaves a cycle income unmarked", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 20_000,
		extra: { type: "repayment", toSavings: false },
	});

	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-20",
	});
	expect(rows.map((row) => [row.amountCents, row.extra, row.startsOn])).toEqual([
		[20_000, true, null],
		[50_000, false, null],
	]);
});

test("a cycle income on 30 Oct waits for the cycle that starts on 1 Nov and leaves today's number alone", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });

	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toEqual(before);
	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});
	expect(rows[0]).toMatchObject({ amountCents: 100_000, startsOn: "2026-11-01", extra: false });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: before.needsCents + 50_000,
		wantsCents: before.wantsCents + 30_000,
		savingsCents: 20_000,
	});
});

test("an Extra on 30 Oct stays in October", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });

	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 100_000,
		extra: { type: "gratification", toSavings: false },
	});

	const after = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(after.needsCents).toBe(before.needsCents + 50_000);
});

test("28 Oct income stays in this cycle; 29 Oct, the third day from the end, waits for November", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-28T17:00:00.000Z"));
	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 10_000 });
	vi.setSystemTime(new Date("2026-10-29T17:00:00.000Z"));
	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 20_000 });

	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-29",
	});
	expect(rows.map((row) => [row.amountCents, row.startsOn])).toEqual([
		[20_000, "2026-11-01"],
		[10_000, null],
		[50_000, null],
	]);
});

test("editing an early income to S/ 2,000 changes what November starts with", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});

	await ana.as.mutation(api.transactions.updateIncome, {
		space: "personal",
		id: rows[0].id,
		amountCents: 200_000,
	});

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: 25_000 + 100_000,
		wantsCents: 15_000 + 60_000,
		savingsCents: 40_000,
	});
});

test("deleting an early income leaves November with only what carried over", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});

	await ana.as.mutation(api.transactions.deleteIncome, { space: "personal", id: rows[0].id });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: 25_000,
		wantsCents: 15_000,
		savingsCents: 0,
	});
});

test("editing a Bono that went straight to Ahorro keeps it in Ahorro", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 20_000,
		extra: { type: "bonus", toSavings: true },
	});
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });
	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-20",
	});

	await ana.as.mutation(api.transactions.updateIncome, {
		space: "personal",
		id: rows[0].id,
		amountCents: 30_000,
	});

	const after = await ana.as.query(api.balances.getBalances, { space: "personal" });
	expect(after).toEqual({ ...before, savingsCents: before.savingsCents + 10_000 });
});

test("an early income is not assigned money until the November cycle starts", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	const before = await ana.as.query(api.balances.getHome, {
		space: "personal",
		today: "2026-10-30",
	});

	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	const during = await ana.as.query(api.balances.getHome, {
		space: "personal",
		today: "2026-10-30",
	});
	expect(during.assigned).toEqual(before.assigned);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	const november = await ana.as.query(api.balances.getHome, {
		space: "personal",
		today: "2026-11-01",
	});
	expect(november.assigned).toEqual({
		needsCents: 75_000,
		wantsCents: 45_000,
		savingsCents: 20_000,
	});
});

test("an early income does not take away the empty state of a cycle with no money", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.as.mutation(api.profiles.completeOnboarding, { ...onboard, todayCents: 0 });
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));

	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	const home = await ana.as.query(api.balances.getHome, { space: "personal", today: "2026-10-30" });
	expect(home.empty).toBe(true);
});

test("lowering an early income works even after the current Ahorro went to the fund", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.as.mutation(api.transactions.addSaving, { space: "personal", amountCents: 10_000 });
	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});
	const early = rows.find((row) => row.startsOn !== null);
	if (!early) throw new Error("missing early income");

	await ana.as.mutation(api.transactions.updateIncome, {
		space: "personal",
		id: early.id,
		amountCents: 50_000,
	});

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		savingsCents: 10_000,
	});
});

test("an income on the last day of the cycle, 31 Oct, starts November", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-31T17:00:00.000Z"));
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });

	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toEqual(before);
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: 25_000 + 50_000,
		wantsCents: 15_000 + 30_000,
		savingsCents: 20_000,
	});
});

test("an Extra registered with an early income does not start November as income", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.as.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 100_000,
		extra: { type: "bonus", toSavings: false },
	});
	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });

	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-11-01",
	});
	expect(rows.map((row) => [row.amountCents, row.extra, row.startsOn])).toEqual([
		[100_000, false, null],
	]);
	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: 25_000 + 50_000 + 50_000,
		wantsCents: 15_000 + 30_000 + 30_000,
		savingsCents: 20_000,
	});
});

test("opening November twice does not duplicate the early income", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));

	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	const first = await ana.as.query(api.balances.getBalances, { space: "personal" });
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });

	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toEqual(first);
	const { rows } = await ana.as.query(api.transactions.list, {
		space: "personal",
		today: "2026-11-01",
	});
	expect(rows.map((row) => row.amountCents)).toEqual([100_000]);
});

test("an early income still starts November in a cycle with more than 500 movements", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await t.run(async (ctx) => {
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		const first = (await ctx.db.query("transactions").take(1))[0];
		for (let i = 0; i < 510; i++) {
			await ctx.db.insert("transactions", {
				kind: "expense",
				spaceId: first.spaceId,
				cycleId: cycle._id,
				userId: first.userId,
				amountCents: 1,
				date: "2026-10-25",
				envelope: "needs",
			});
		}
	});
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	const before = await ana.as.query(api.balances.getBalances, { space: "personal" });
	await ana.as.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });

	expect(await ana.as.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: before.needsCents + 50_000,
		wantsCents: before.wantsCents + 30_000,
		savingsCents: 20_000,
	});
});
