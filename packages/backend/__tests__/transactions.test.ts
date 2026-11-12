import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { splitIncome } from "../shared/budget";
import { type Harness, harness, joinedCouple, signIn } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const SPLIT = { needs: 50, wants: 30, savings: 20 };
const SPLIT_40 = { needs: 40, wants: 40, savings: 20 };

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: SPLIT,
};

async function anaOnOct20(t: Harness) {
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Ana" });
	return ana;
}

async function expenseId(t: Harness) {
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

async function incomeId(t: Harness, amountCents: number) {
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
	await ana.mutation(api.transactions.addExpense, {
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
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
	});
	const id = await expenseId(t);
	await ana.mutation(api.transactions.updateExpense, {
		space: "personal",
		id,
		amountCents: 8_000,
		envelope: "wants",
	});
	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(balances.needsCents).toBe(25_000);
	expect(balances.wantsCents).toBe(7_000);
});

test("delete expense returns the amount to its envelope", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
	});
	const id = await expenseId(t);
	await ana.mutation(api.transactions.deleteExpense, { space: "personal", id });
	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(balances.needsCents).toBe(25_000);
});

test("Luis cannot edit or delete Ana's expense", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
	});
	const id = await expenseId(t);

	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Luis" });

	await expect(
		luis.mutation(api.transactions.updateExpense, {
			space: "personal",
			id,
			amountCents: 1_000,
			envelope: "needs",
		}),
	).rejects.toThrow("No encontramos este dato.");
	await expect(
		luis.mutation(api.transactions.deleteExpense, { space: "personal", id }),
	).rejects.toThrow("No encontramos este dato.");

	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(balances.needsCents).toBe(20_000);
});

test("income S/ 100 splits 50/30/20; deleting it reverts the stored allocation after a split change", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const afterAdd = await ana.query(api.balances.getBalances, { space: "personal" });
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

	await ana.mutation(api.transactions.deleteIncome, { space: "personal", id });
	const afterDelete = await ana.query(api.balances.getBalances, { space: "personal" });
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
		ana.mutation(api.transactions.addSaving, {
			space: "personal",
			amountCents: 10_100,
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 10_000,
	});
	const afterSave = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(afterSave.savingsCents).toBe(0);

	await expect(
		ana.mutation(api.transactions.withdrawSaving, {
			space: "personal",
			amountCents: 10_100,
			reason: "other",
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 10_000,
		reason: "other",
	});
	const afterWithdraw = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(afterWithdraw.needsCents).toBe(35_000);
	expect(afterWithdraw.savingsCents).toBe(0);
});

async function anaWithFund(t: Harness) {
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 10_000 });
	return ana;
}

function readFundCents(t: Harness) {
	return t.run(async (ctx) => (await ctx.db.query("spaces").take(1))[0].fundCents);
}

test("withdrawing S/ 100 as emergency raises Necesidades 10000 and empties the fund", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 10_000,
		reason: "emergency",
	});

	const after = await ana.query(api.balances.getBalances, { space: "personal" });
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
		ana.mutation(api.transactions.withdrawSaving, { space: "personal", amountCents: 10_000 }),
	).rejects.toThrow();

	expect(await readFundCents(t)).toBe(10_000);
});

test("a withdrawal with an unknown reason fails and moves nothing", async () => {
	const t = harness();
	const ana = await anaWithFund(t);

	await expect(
		ana.mutation(api.transactions.withdrawSaving, {
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
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await expect(
		ana.mutation(api.transactions.withdrawSaving, {
			space: "personal",
			amountCents: 100,
			reason: "emergency",
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toEqual(before);
	expect(await readFundCents(t)).toBe(0);
});

test("el segundo retiro que pasa el fondo falla y no cambia nada", async () => {
	const t = harness();
	const ana = await anaWithFund(t);

	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 6_000,
		reason: "emergency",
	});
	const afterFirst = await ana.query(api.balances.getBalances, { space: "personal" });

	await expect(
		ana.mutation(api.transactions.withdrawSaving, {
			space: "personal",
			amountCents: 6_000,
			reason: "emergency",
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toEqual(afterFirst);
	expect(await readFundCents(t)).toBe(4_000);
});

test("a withdrawal raises the amount you can spend today", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	const args = { space: "personal" as const, today: "2026-10-20" };
	const before = await ana.query(api.balances.getHome, args);

	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 10_000,
		reason: "emergency",
	});

	const after = await ana.query(api.balances.getHome, args);
	expect(after.dailyCents).toBeGreaterThan(before.dailyCents);
});

test("updateIncome S/ 100 → S/ 200 updates envelopes to the new split", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const id = await incomeId(t, 10_000);
	await ana.mutation(api.transactions.updateIncome, {
		space: "personal",
		id,
		amountCents: 20_000,
	});
	const share = splitIncome(20_000, SPLIT);
	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(balances).toMatchObject({
		needsCents: 25_000 + share.needsCents,
		wantsCents: 15_000 + share.wantsCents,
		savingsCents: 10_000 + share.savingsCents,
	});
});

test("deleteIncome fails if that income's Ahorro was already moved to the fund", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const id = await incomeId(t, 10_000);
	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 12_000,
	});

	await expect(
		ana.mutation(api.transactions.deleteIncome, { space: "personal", id }),
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
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const id = await incomeId(t, 10_000);
	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 12_000,
	});
	await ana.mutation(api.transactions.updateIncome, {
		space: "personal",
		id,
		amountCents: 20_000,
	});
	const share = splitIncome(20_000, SPLIT);
	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(balances).toMatchObject({
		needsCents: 25_000 + share.needsCents,
		wantsCents: 15_000 + share.wantsCents,
		savingsCents: 10_000 + share.savingsCents - 12_000,
	});
});

test("updateIncome S/ 100 → S/ 50 fails after saving S/ 120 from that income's Ahorro", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const id = await incomeId(t, 10_000);
	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 12_000,
	});
	await expect(
		ana.mutation(api.transactions.updateIncome, {
			space: "personal",
			id,
			amountCents: 5_000,
		}),
	).rejects.toThrow("Ya usaste parte de este ingreso en tu ahorro. Retíralo primero.");
});

test("list returns the open cycle newest first and leaves out the other cycle", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 1_000,
		envelope: "needs",
	});
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 2_000,
		envelope: "wants",
	});

	const october = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-20",
	});
	expect(october.rows.map((row) => row.amountCents)).toEqual([2_000, 1_000, 50_000]);
	expect(october.rows.every((row) => row.who === null)).toBe(true);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 3_000,
		envelope: "needs",
	});

	const november = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-11-01",
	});
	expect(november.rows.map((row) => row.amountCents)).toEqual([3_000]);
});

test("list in household is newest first with mine and author who", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });

	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Ana" });
	await ana.mutation(api.profiles.startTrial, {});
	await ana.mutation(api.household.createHousehold, { name: "Casa" });
	const { code } = await ana.mutation(api.household.createInvite, {});

	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Luis" });
	expect(await luis.mutation(api.household.joinHousehold, { code })).toEqual({ ok: true });

	await ana.mutation(api.transactions.addExpense, {
		space: "household",
		amountCents: 1_000,
		envelope: "needs",
	});
	await luis.mutation(api.transactions.addExpense, {
		space: "household",
		amountCents: 2_000,
		envelope: "wants",
	});

	const list = await ana.query(api.transactions.list, {
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
	const before = await ana.query(api.balances.getBalances, { space: "personal" });
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 10_000,
	});
	const id = await incomeId(t, 10_000);
	await ana.mutation(api.transactions.updateIncome, {
		space: "personal",
		id,
		amountCents: 20_000,
	});
	await ana.mutation(api.transactions.deleteIncome, { space: "personal", id });
	const after = await ana.query(api.balances.getBalances, { space: "personal" });
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
		ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 1 }),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");
	await expect(
		ana.mutation(api.transactions.withdrawSaving, {
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

	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 5_000,
		envelope: "needs",
		note: `  ${note}  `,
	});
	await expect(
		ana.mutation(api.transactions.addExpense, {
			space: "personal",
			amountCents: 5_000,
			envelope: "needs",
			note: `${note}n`,
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-20",
	});
	expect(rows.filter((row) => row.kind === "expense").map((row) => row.note)).toEqual([note]);
});

test("an Extra Bono of S/ 200 straight to Ahorro leaves the number of the day unchanged", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 20_000,
		extra: { type: "bonus", toSavings: true },
	});

	const after = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(after).toEqual({ ...before, savingsCents: before.savingsCents + 20_000 });
});

test("an Extra Bono of S/ 200 to the envelopes splits 50/30/20 and raises the number of the day", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 20_000,
		extra: { type: "bonus", toSavings: false },
	});

	const after = await ana.query(api.balances.getBalances, { space: "personal" });
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
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 20_000,
		extra: { type: "repayment", toSavings: false },
	});

	const { rows } = await ana.query(api.transactions.list, {
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
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toEqual(before);
	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});
	expect(rows[0]).toMatchObject({ amountCents: 100_000, startsOn: "2026-11-01", extra: false });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: before.needsCents + 50_000,
		wantsCents: before.wantsCents + 30_000,
		savingsCents: 20_000,
	});
});

test("an Extra on 30 Oct stays in October", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 100_000,
		extra: { type: "gratification", toSavings: false },
	});

	const after = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(after.needsCents).toBe(before.needsCents + 50_000);
});

test("28 Oct income stays in this cycle; 29 Oct, the third day from the end, waits for November", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-28T17:00:00.000Z"));
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 10_000 });
	vi.setSystemTime(new Date("2026-10-29T17:00:00.000Z"));
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 20_000 });

	const { rows } = await ana.query(api.transactions.list, {
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
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});

	await ana.mutation(api.transactions.updateIncome, {
		space: "personal",
		id: rows[0].id,
		amountCents: 200_000,
	});

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: 25_000 + 100_000,
		wantsCents: 15_000 + 60_000,
		savingsCents: 40_000,
	});
});

test("deleting an early income leaves November with only what carried over", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});

	await ana.mutation(api.transactions.deleteIncome, { space: "personal", id: rows[0].id });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: 25_000,
		wantsCents: 15_000,
		savingsCents: 0,
	});
});

test("editing a Bono that went straight to Ahorro keeps it in Ahorro", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 20_000,
		extra: { type: "bonus", toSavings: true },
	});
	const before = await ana.query(api.balances.getBalances, { space: "personal" });
	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-20",
	});

	await ana.mutation(api.transactions.updateIncome, {
		space: "personal",
		id: rows[0].id,
		amountCents: 30_000,
	});

	const after = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(after).toEqual({ ...before, savingsCents: before.savingsCents + 10_000 });
});

test("an early income is not assigned money until the November cycle starts", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	const before = await ana.query(api.balances.getHome, {
		space: "personal",
		today: "2026-10-30",
	});

	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	const during = await ana.query(api.balances.getHome, {
		space: "personal",
		today: "2026-10-30",
	});
	expect(during.assigned).toEqual(before.assigned);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	const november = await ana.query(api.balances.getHome, {
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
	await ana.mutation(api.profiles.completeOnboarding, {
		name: "Ana",
		...onboard,
		todayCents: 0,
	});
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));

	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-30" });
	expect(home.empty).toBe(true);
});

test("lowering an early income works even after the current Ahorro went to the fund", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 10_000 });
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});
	const early = rows.find((row) => row.startsOn !== null);
	if (!early) throw new Error("missing early income");

	await ana.mutation(api.transactions.updateIncome, {
		space: "personal",
		id: early.id,
		amountCents: 50_000,
	});

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		savingsCents: 10_000,
	});
});

test("an income on the last day of the cycle, 31 Oct, starts November", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-31T17:00:00.000Z"));
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toEqual(before);
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: 25_000 + 50_000,
		wantsCents: 15_000 + 30_000,
		savingsCents: 20_000,
	});
});

test("an Extra registered with an early income does not start November as income", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 100_000,
		extra: { type: "bonus", toSavings: false },
	});
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-11-01",
	});
	expect(rows.map((row) => [row.amountCents, row.extra, row.startsOn])).toEqual([
		[100_000, false, null],
	]);
	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: 25_000 + 50_000 + 50_000,
		wantsCents: 15_000 + 30_000 + 30_000,
		savingsCents: 20_000,
	});
});

test("opening November twice does not duplicate the early income", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));

	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	const first = await ana.query(api.balances.getBalances, { space: "personal" });
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toEqual(first);
	const { rows } = await ana.query(api.transactions.list, {
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
	const before = await ana.query(api.balances.getBalances, { space: "personal" });
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: before.needsCents + 50_000,
		wantsCents: before.wantsCents + 30_000,
		savingsCents: 20_000,
	});
});

test("choosing the rest of October on 30 Oct puts the income in the current cycle", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 100_000,
		forNextCycle: false,
	});

	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toMatchObject({
		needsCents: before.needsCents + 50_000,
		wantsCents: before.wantsCents + 30_000,
		savingsCents: before.savingsCents + 20_000,
	});
	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});
	expect(rows[0]).toMatchObject({ amountCents: 100_000, startsOn: null });
});

test("choosing November on 30 Oct waits for the new cycle, same as sending nothing", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	const before = await ana.query(api.balances.getBalances, { space: "personal" });

	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 100_000,
		forNextCycle: true,
	});

	expect(await ana.query(api.balances.getBalances, { space: "personal" })).toEqual(before);
	const { rows } = await ana.query(api.transactions.list, {
		space: "personal",
		today: "2026-10-30",
	});
	expect(rows[0]).toMatchObject({ amountCents: 100_000, startsOn: "2026-11-01" });
});

test("Inicio reports the window and the early income with the day it starts", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const args = { space: "personal" as const, today: "2026-10-20" };
	expect(await ana.query(api.balances.getHome, args)).toMatchObject({
		earlyWindow: false,
		earlyIncome: null,
	});

	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });

	expect(
		await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-30" }),
	).toMatchObject({
		earlyWindow: true,
		earlyIncome: { amountCents: 100_000, startsOn: "2026-11-01" },
	});
});

const NOT_AUTHOR = "Solo quien lo registró puede cambiarlo.";
const NOT_FOUND = "No encontramos este dato.";
const TODAY = "2026-10-20";

type Ana = Awaited<ReturnType<typeof anaOnOct20>>;

async function rowOf(ana: Ana, kind: "saving" | "withdrawal") {
	const { rows } = await ana.query(api.transactions.list, { space: "personal", today: TODAY });
	const row = rows.find((item) => item.kind === kind);
	if (!row) throw new Error(`missing ${kind}`);
	return row;
}

async function figures(ana: Ana, t: Harness) {
	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	return {
		savings: balances.savingsCents,
		needs: balances.needsCents,
		fund: await readFundCents(t),
	};
}

test("only who recorded a saving or a withdrawal changes or deletes it", async () => {
	const couple = await joinedCouple();
	const ana = couple.ana.as;
	const luis = couple.luis.as;
	const household = "household" as const;
	await ana.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await ana.mutation(api.transactions.addSaving, { space: household, amountCents: 5_000 });
	await ana.mutation(api.transactions.withdrawSaving, {
		space: household,
		amountCents: 1_000,
		reason: "other",
	});
	const list = () => luis.query(api.transactions.list, { space: household, today: TODAY });
	const { rows } = await list();
	const saving = rows.find((row) => row.kind === "saving")?.id;
	const withdrawal = rows.find((row) => row.kind === "withdrawal")?.id;
	if (!saving || !withdrawal) throw new Error("missing rows");

	await expect(
		luis.mutation(api.transactions.updateSaving, {
			space: household,
			id: saving,
			amountCents: 1,
		}),
	).rejects.toThrow(NOT_AUTHOR);
	await expect(
		luis.mutation(api.transactions.deleteSaving, { space: household, id: saving }),
	).rejects.toThrow(NOT_AUTHOR);
	await expect(
		luis.mutation(api.transactions.updateWithdrawal, {
			space: household,
			id: withdrawal,
			amountCents: 1,
			reason: "other",
		}),
	).rejects.toThrow(NOT_AUTHOR);
	await expect(
		luis.mutation(api.transactions.deleteWithdrawal, { space: household, id: withdrawal }),
	).rejects.toThrow(NOT_AUTHOR);

	await ana.mutation(api.transactions.updateSaving, {
		space: household,
		id: saving,
		amountCents: 6_000,
		note: "Corregido",
	});
	await ana.mutation(api.transactions.updateWithdrawal, {
		space: household,
		id: withdrawal,
		amountCents: 500,
		reason: "emergency",
	});
	const edited = (await list()).rows;
	expect(edited.find((row) => row.id === saving)).toMatchObject({
		amountCents: 6_000,
		note: "Corregido",
	});
	expect(edited.find((row) => row.id === withdrawal)).toMatchObject({
		amountCents: 500,
		reason: "emergency",
	});

	await ana.mutation(api.transactions.deleteWithdrawal, { space: household, id: withdrawal });
	await ana.mutation(api.transactions.deleteSaving, { space: household, id: saving });
	expect(
		(await list()).rows.some((row) => row.kind === "saving" || row.kind === "withdrawal"),
	).toBe(false);
});

test("a saving or a withdrawal of a cycle that already closed cannot be changed", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 1_000,
		reason: "other",
	});
	const saving = (await rowOf(ana, "saving")).id;
	const withdrawal = (await rowOf(ana, "withdrawal")).id;
	vi.setSystemTime(new Date("2026-11-05T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	const before = await figures(ana, t);

	await expect(
		ana.mutation(api.transactions.updateSaving, {
			space: "personal",
			id: saving,
			amountCents: 1,
		}),
	).rejects.toThrow(NOT_FOUND);
	await expect(
		ana.mutation(api.transactions.deleteSaving, { space: "personal", id: saving }),
	).rejects.toThrow(NOT_FOUND);
	await expect(
		ana.mutation(api.transactions.updateWithdrawal, {
			space: "personal",
			id: withdrawal,
			amountCents: 1,
			reason: "other",
		}),
	).rejects.toThrow(NOT_FOUND);
	await expect(
		ana.mutation(api.transactions.deleteWithdrawal, { space: "personal", id: withdrawal }),
	).rejects.toThrow(NOT_FOUND);
	expect(await figures(ana, t)).toEqual(before);
});

test("editing and deleting a saving to a goal moves Ahorro and what the goal has, never the fund", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.goals.add, { space: "personal", name: "Viaje", targetCents: 100_000 });
	const [goal] = await ana.query(api.goals.list, { space: "personal" });
	const start = await figures(ana, t);
	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 4_000,
		goalId: goal.id,
	});
	const saving = await rowOf(ana, "saving");
	expect(saving.goalId).toBe(goal.id);

	await ana.mutation(api.transactions.updateSaving, {
		space: "personal",
		id: saving.id,
		amountCents: 6_000,
	});
	expect((await ana.query(api.goals.list, { space: "personal" }))[0].savedCents).toBe(6_000);
	expect(await figures(ana, t)).toEqual({ ...start, savings: start.savings - 6_000 });

	await ana.mutation(api.transactions.deleteSaving, { space: "personal", id: saving.id });
	expect((await ana.query(api.goals.list, { space: "personal" }))[0].savedCents).toBe(0);
	expect(await figures(ana, t)).toEqual(start);
});

test("editing and deleting a saving to the fund moves Ahorro and the fund together", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	const start = await figures(ana, t);
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 10_000 });
	const saving = await rowOf(ana, "saving");
	expect(saving.goalId).toBeNull();

	await ana.mutation(api.transactions.updateSaving, {
		space: "personal",
		id: saving.id,
		amountCents: 6_000,
	});
	expect(await figures(ana, t)).toEqual({ ...start, savings: start.savings - 6_000, fund: 6_000 });

	await ana.mutation(api.transactions.deleteSaving, { space: "personal", id: saving.id });
	expect(await figures(ana, t)).toEqual(start);
});

test("a saving can go up to what Ahorro has plus its own amount, and not one cent more", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 4_000 });
	const saving = await rowOf(ana, "saving");
	const before = await figures(ana, t);

	await expect(
		ana.mutation(api.transactions.updateSaving, {
			space: "personal",
			id: saving.id,
			amountCents: 10_001,
		}),
	).rejects.toThrow("Solo tienes S/ 100.00 para este ahorro. Baja el monto.");
	expect(await figures(ana, t)).toEqual(before);

	await ana.mutation(api.transactions.updateSaving, {
		space: "personal",
		id: saving.id,
		amountCents: 10_000,
	});
	expect(await figures(ana, t)).toEqual({ savings: 0, needs: before.needs, fund: 10_000 });
});

test("editing and deleting a withdrawal moves the fund and Necesidades the other way, and can change its reason", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	const start = await figures(ana, t);
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 4_000,
		reason: "emergency",
	});
	const withdrawal = await rowOf(ana, "withdrawal");
	expect(withdrawal.reason).toBe("emergency");

	await ana.mutation(api.transactions.updateWithdrawal, {
		space: "personal",
		id: withdrawal.id,
		amountCents: 7_000,
		reason: "other",
		note: "Médico",
	});
	expect(await figures(ana, t)).toEqual({
		...start,
		needs: start.needs + 7_000,
		fund: start.fund - 7_000,
	});
	expect(await rowOf(ana, "withdrawal")).toMatchObject({ reason: "other", note: "Médico" });

	await ana.mutation(api.transactions.deleteWithdrawal, {
		space: "personal",
		id: withdrawal.id,
	});
	expect(await figures(ana, t)).toEqual(start);
});

test("a withdrawal can go up to what the fund has plus its own amount, and not one cent more", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 4_000,
		reason: "other",
	});
	const withdrawal = await rowOf(ana, "withdrawal");
	const before = await figures(ana, t);

	await expect(
		ana.mutation(api.transactions.updateWithdrawal, {
			space: "personal",
			id: withdrawal.id,
			amountCents: 10_001,
			reason: "other",
		}),
	).rejects.toThrow("Solo tienes S/ 100.00 en el fondo para este retiro. Baja el monto.");
	expect(await figures(ana, t)).toEqual(before);

	await ana.mutation(api.transactions.updateWithdrawal, {
		space: "personal",
		id: withdrawal.id,
		amountCents: 10_000,
		reason: "other",
	});
	expect((await figures(ana, t)).fund).toBe(0);
});

test("a saving to the fund cannot be deleted or lowered below what was already withdrawn from it", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 4_000,
		reason: "other",
	});
	const saving = await rowOf(ana, "saving");
	const before = await figures(ana, t);
	const ALREADY = "Ya retiraste parte de este ahorro del fondo. Borra primero ese retiro.";

	await expect(
		ana.mutation(api.transactions.deleteSaving, { space: "personal", id: saving.id }),
	).rejects.toThrow(ALREADY);
	await expect(
		ana.mutation(api.transactions.updateSaving, {
			space: "personal",
			id: saving.id,
			amountCents: 3_999,
		}),
	).rejects.toThrow(ALREADY);
	expect(await figures(ana, t)).toEqual(before);

	await ana.mutation(api.transactions.updateSaving, {
		space: "personal",
		id: saving.id,
		amountCents: 4_000,
	});
	expect((await figures(ana, t)).fund).toBe(0);
});

test("deleting a withdrawal can leave Necesidades below zero, like an overspend", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 10_000,
		reason: "other",
	});
	const { needs } = await figures(ana, t);
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: needs,
		envelope: "needs",
	});

	await ana.mutation(api.transactions.deleteWithdrawal, {
		space: "personal",
		id: (await rowOf(ana, "withdrawal")).id,
	});

	expect(await figures(ana, t)).toMatchObject({ needs: -10_000, fund: 10_000 });
});

test("changing a saving or a withdrawal to zero, a negative or a fraction of a cent fails and moves nothing", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 5_000 });
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 4_000,
		reason: "other",
	});
	// A saving to a goal: lowering one to the fund is also stopped by what was already withdrawn.
	await ana.mutation(api.goals.add, { space: "personal", name: "Viaje", targetCents: 100_000 });
	const [goal] = await ana.query(api.goals.list, { space: "personal" });
	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 2_000,
		goalId: goal.id,
	});
	const { rows } = await ana.query(api.transactions.list, { space: "personal", today: TODAY });
	const saving = rows.find((row) => row.goalId === goal.id);
	if (!saving) throw new Error("missing saving");
	const withdrawal = await rowOf(ana, "withdrawal");
	const before = await figures(ana, t);

	for (const amountCents of [0, -100, 100.5]) {
		await expect(
			ana.mutation(api.transactions.updateSaving, {
				space: "personal",
				id: saving.id,
				amountCents,
			}),
		).rejects.toThrow();
		await expect(
			ana.mutation(api.transactions.updateWithdrawal, {
				space: "personal",
				id: withdrawal.id,
				amountCents,
				reason: "other",
			}),
		).rejects.toThrow();
	}
	expect(await figures(ana, t)).toEqual(before);
});

test("a saving cannot be changed through the id of an expense, nor a withdrawal deleted through the id of a saving", async () => {
	const t = harness();
	const ana = await anaWithFund(t);
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 1_000,
		envelope: "needs",
	});
	const before = await figures(ana, t);

	await expect(
		ana.mutation(api.transactions.updateSaving, {
			space: "personal",
			id: await expenseId(t),
			amountCents: 500,
		}),
	).rejects.toThrow(NOT_FOUND);
	await expect(
		ana.mutation(api.transactions.deleteWithdrawal, {
			space: "personal",
			id: (await rowOf(ana, "saving")).id,
		}),
	).rejects.toThrow(NOT_FOUND);
	expect(await figures(ana, t)).toEqual(before);
});

test("saving a saving or a withdrawal with nothing changed leaves no event in Nuestro espacio", async () => {
	const couple = await joinedCouple();
	const ana = couple.ana.as;
	const household = "household" as const;
	await ana.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await ana.mutation(api.transactions.addSaving, { space: household, amountCents: 5_000 });
	await ana.mutation(api.transactions.withdrawSaving, {
		space: household,
		amountCents: 1_000,
		reason: "other",
	});
	const { rows } = await ana.query(api.transactions.list, { space: household, today: TODAY });
	const saving = rows.find((row) => row.kind === "saving");
	const withdrawal = rows.find((row) => row.kind === "withdrawal");
	if (!saving || !withdrawal) throw new Error("missing rows");
	const eventCount = async () => (await ana.query(api.activity.list, {})).events.length;
	const start = await eventCount();

	await ana.mutation(api.transactions.updateSaving, {
		space: household,
		id: saving.id,
		amountCents: 5_000,
	});
	await ana.mutation(api.transactions.updateWithdrawal, {
		space: household,
		id: withdrawal.id,
		amountCents: 1_000,
		reason: "other",
	});
	expect(await eventCount()).toBe(start);

	await ana.mutation(api.transactions.updateSaving, {
		space: household,
		id: saving.id,
		amountCents: 4_000,
	});
	await ana.mutation(api.transactions.updateWithdrawal, {
		space: household,
		id: withdrawal.id,
		amountCents: 1_000,
		reason: "emergency",
	});
	expect(await eventCount()).toBe(start + 2);
});

test("list with a limit returns only the newest movements, as Inicio asks for 5", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	for (const amountCents of [1_000, 2_000, 3_000, 4_000, 5_000, 6_000]) {
		await ana.mutation(api.transactions.addExpense, {
			space: "personal",
			amountCents,
			envelope: "needs",
		});
	}
	const args = { space: "personal" as const, today: TODAY };
	const recent = await ana.query(api.transactions.list, { ...args, limit: 5 });
	expect(recent.rows.map((row) => row.amountCents)).toEqual([6_000, 5_000, 4_000, 3_000, 2_000]);
	expect((await ana.query(api.transactions.list, args)).rows).toHaveLength(7);
	for (const limit of [0, -1, 1.5, 501, Number.NaN]) {
		await expect(ana.query(api.transactions.list, { ...args, limit })).rejects.toThrow(
			"Revisa los datos",
		);
	}
});

test("changing only the note of a saving or a withdrawal keeps every balance", async () => {
	const t = harness();
	const ana = await anaOnOct20(t);
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 10_000 });
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 4_000,
		reason: "other",
	});
	const start = await figures(ana, t);
	const saving = await rowOf(ana, "saving");
	const withdrawal = await rowOf(ana, "withdrawal");

	await ana.mutation(api.transactions.updateSaving, {
		space: "personal",
		id: saving.id,
		amountCents: 10_000,
		note: "Para el viaje",
	});
	await ana.mutation(api.transactions.updateWithdrawal, {
		space: "personal",
		id: withdrawal.id,
		amountCents: 4_000,
		reason: "other",
		note: "Dentista",
	});
	expect(await figures(ana, t)).toEqual(start);
	expect((await rowOf(ana, "saving")).note).toBe("Para el viaje");
	expect((await rowOf(ana, "withdrawal")).note).toBe("Dentista");
});

test("a new note on a saving or a withdrawal is one event, the same note again is none", async () => {
	const couple = await joinedCouple();
	const ana = couple.ana.as;
	const household = "household" as const;
	await ana.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await ana.mutation(api.transactions.addSaving, { space: household, amountCents: 5_000 });
	await ana.mutation(api.transactions.withdrawSaving, {
		space: household,
		amountCents: 1_000,
		reason: "other",
	});
	const { rows } = await ana.query(api.transactions.list, { space: household, today: TODAY });
	const saving = rows.find((row) => row.kind === "saving");
	const withdrawal = rows.find((row) => row.kind === "withdrawal");
	if (!saving || !withdrawal) throw new Error("missing rows");
	const eventCount = async () => (await ana.query(api.activity.list, {})).events.length;
	const start = await eventCount();
	const edit = async () => {
		await ana.mutation(api.transactions.updateSaving, {
			space: household,
			id: saving.id,
			amountCents: 5_000,
			note: "Viaje",
		});
		await ana.mutation(api.transactions.updateWithdrawal, {
			space: household,
			id: withdrawal.id,
			amountCents: 1_000,
			reason: "other",
			note: "Dentista",
		});
	};

	await edit();
	expect(await eventCount()).toBe(start + 2);
	await edit();
	expect(await eventCount()).toBe(start + 2);
});
