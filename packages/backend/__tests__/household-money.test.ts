import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { firstName } from "../shared/household";
import { DAY, joinedCouple, setTrialEnd, TODAY } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const household = "household" as const;

test("firstName keeps only the first word", () => {
	expect(firstName("Camila Rojas")).toBe("Camila");
	expect(firstName("  Renzo   Paz ")).toBe("Renzo");
	expect(firstName("Ana")).toBe("Ana");
	expect(firstName("   ")).toBe("");
});

test("two people writing in turn: the envelopes add up and each row keeps its author", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	for (let i = 0; i < 3; i++) {
		await Promise.all([
			ana.as.mutation(api.transactions.addExpense, {
				space: household,
				amountCents: 1_000,
				envelope: "needs",
			}),
			luis.as.mutation(api.transactions.addExpense, {
				space: household,
				amountCents: 500,
				envelope: "needs",
			}),
		]);
	}
	const home = await ana.as.query(api.balances.getHome, { space: household, today: TODAY });
	expect(home.needsCents).toBe(50_000 - 4_500);

	const { rows } = await ana.as.query(api.transactions.list, { space: household, today: TODAY });
	const expenses = rows.filter((row) => row.kind === "expense");
	expect(expenses.filter((row) => row.mine).map((row) => row.amountCents)).toEqual([
		1_000, 1_000, 1_000,
	]);
	expect(expenses.filter((row) => !row.mine).map((row) => row.amountCents)).toEqual([
		500, 500, 500,
	]);
});

test("who is the first name only, and mine is told apart", async () => {
	const { ana, luis } = await joinedCouple();
	await luis.as.mutation(api.transactions.addExpense, {
		space: household,
		amountCents: 500,
		envelope: "wants",
		note: "Cine",
	});
	const seenByAna = await ana.as.query(api.transactions.list, { space: household, today: TODAY });
	expect(seenByAna.rows[0]).toMatchObject({ who: "Renzo", mine: false, note: "Cine" });
	const seenByLuis = await luis.as.query(api.transactions.list, { space: household, today: TODAY });
	expect(seenByLuis.rows[0]).toMatchObject({ who: "Renzo", mine: true });
});

test("an income to the household uses the household split, not the split of who records it", async () => {
	const { ana } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	const home = await ana.as.query(api.balances.getHome, { space: household, today: TODAY });
	expect([home.needsCents, home.wantsCents, home.savingsCents]).toEqual([50_000, 30_000, 20_000]);
});

test("contributions add each person's incomes of the cycle, not the ones for the next", async () => {
	const { ana, luis } = await joinedCouple();
	expect(await ana.as.query(api.household.contributions, { today: TODAY })).toEqual({
		mineCents: 0,
		partnerCents: 0,
	});
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 50_000 });
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 20_000 });
	await luis.as.mutation(api.transactions.addIncome, { space: household, amountCents: 30_000 });
	await luis.as.mutation(api.transactions.addExpense, {
		space: household,
		amountCents: 9_000,
		envelope: "needs",
	});
	expect(await ana.as.query(api.household.contributions, { today: TODAY })).toEqual({
		mineCents: 70_000,
		partnerCents: 30_000,
	});
	expect(await luis.as.query(api.household.contributions, { today: TODAY })).toEqual({
		mineCents: 30_000,
		partnerCents: 70_000,
	});
});

test("contributions leave out an income for the next cycle", async () => {
	const { t, ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 50_000 });
	vi.setSystemTime(new Date("2026-11-13T17:00:00.000Z"));
	await setTrialEnd(t, ana.userId, Date.now() + 60 * DAY);
	// Two days before the cycle ends, a salary goes to the next cycle.
	await luis.as.mutation(api.transactions.addIncome, { space: household, amountCents: 40_000 });
	const { rows } = await ana.as.query(api.transactions.list, {
		space: household,
		today: "2026-11-13",
	});
	expect(rows.find((row) => row.startsOn !== null)?.amountCents).toBe(40_000);

	expect(await ana.as.query(api.household.contributions, { today: "2026-11-13" })).toEqual({
		mineCents: 50_000,
		partnerCents: 0,
	});
});

test("contributions count every income of the cycle, also after 500 other rows", async () => {
	const { t, ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 50_000 });
	await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(10)).find((row) => row.kind === "household");
		if (!space) throw new Error("missing household");
		const cycle = await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", space._id))
			.first();
		if (!cycle) throw new Error("missing cycle");
		for (let i = 0; i < 500; i++) {
			await ctx.db.insert("transactions", {
				kind: "expense",
				spaceId: space._id,
				cycleId: cycle._id,
				userId: ana.userId,
				amountCents: 1,
				date: cycle.startDate,
				envelope: "needs",
			});
		}
	});
	await luis.as.mutation(api.transactions.addIncome, { space: household, amountCents: 30_000 });
	expect(await ana.as.query(api.household.contributions, { today: TODAY })).toEqual({
		mineCents: 50_000,
		partnerCents: 30_000,
	});
});

test("only who recorded an expense or an income changes or deletes it", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 50_000 });
	await ana.as.mutation(api.transactions.addExpense, {
		space: household,
		amountCents: 1_000,
		envelope: "needs",
	});
	const { rows } = await luis.as.query(api.transactions.list, { space: household, today: TODAY });
	const expenseId = rows.find((row) => row.kind === "expense")?.id;
	const incomeId = rows.find((row) => row.kind === "income")?.id;
	if (!expenseId || !incomeId) throw new Error("missing rows");
	const NOT_AUTHOR = "Solo quien lo registró puede cambiarlo.";

	await expect(
		luis.as.mutation(api.transactions.updateExpense, {
			space: household,
			id: expenseId,
			amountCents: 1,
			envelope: "needs",
		}),
	).rejects.toThrow(NOT_AUTHOR);
	await expect(
		luis.as.mutation(api.transactions.deleteExpense, { space: household, id: expenseId }),
	).rejects.toThrow(NOT_AUTHOR);
	await expect(
		luis.as.mutation(api.transactions.updateIncome, {
			space: household,
			id: incomeId,
			amountCents: 1,
		}),
	).rejects.toThrow(NOT_AUTHOR);
	await expect(
		luis.as.mutation(api.transactions.deleteIncome, { space: household, id: incomeId }),
	).rejects.toThrow(NOT_AUTHOR);
	await ana.as.mutation(api.transactions.deleteExpense, { space: household, id: expenseId });
});

test("either of the two marks a commitment as paid and the row keeps who paid", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await ana.as.mutation(api.commitments.add, {
		space: household,
		name: "Internet",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "monthly", rule: { kind: "day", day: 25 } },
	});
	const {
		items: [commitment],
	} = await luis.as.query(api.commitments.list, {
		space: household,
		today: TODAY,
	});
	if (!commitment) throw new Error("missing commitment");
	await luis.as.mutation(api.commitments.markPaid, { space: household, id: commitment.id });
	const { rows } = await ana.as.query(api.transactions.list, { space: household, today: TODAY });
	expect(rows.find((row) => row.kind === "expense")).toMatchObject({ who: "Renzo", mine: false });
});

test("the household has no fund goal suggestion, Personal does", async () => {
	const { ana } = await joinedCouple();
	const shared = await ana.as.query(api.goals.fund, { space: household, today: TODAY });
	const own = await ana.as.query(api.goals.fund, { space: "personal", today: TODAY });
	expect(shared.suggestedFundGoalCents).toBeNull();
	expect(own.suggestedFundGoalCents).not.toBeNull();
});

test("saving to the fund and withdrawing in turn keeps the fund exact and never below zero", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await ana.as.mutation(api.transactions.addSaving, { space: household, amountCents: 8_000 });
	await luis.as.mutation(api.transactions.withdrawSaving, {
		space: household,
		amountCents: 3_000,
		reason: "emergency",
	});
	await ana.as.mutation(api.transactions.addSaving, { space: household, amountCents: 2_000 });
	await expect(
		luis.as.mutation(api.transactions.withdrawSaving, {
			space: household,
			amountCents: 7_001,
			reason: "emergency",
		}),
	).rejects.toThrow();
	const fund = await ana.as.query(api.goals.fund, { space: household, today: TODAY });
	expect(fund.fundCents).toBe(7_000);
});

test("either of the two renames the household; 41 characters or blank is refused", async () => {
	const { ana, luis } = await joinedCouple();
	await luis.as.mutation(api.household.rename, { name: "  Nuestra casa " });
	expect((await ana.as.query(api.household.get, {}))?.name).toBe("Nuestra casa");
	await expect(ana.as.mutation(api.household.rename, { name: "x".repeat(41) })).rejects.toThrow();
	await expect(ana.as.mutation(api.household.rename, { name: "   " })).rejects.toThrow();
	expect((await ana.as.query(api.household.get, {}))?.name).toBe("Nuestra casa");
});

test("changing the household cycle keeps the open cycle and sets the next one; Personal stays", async () => {
	const { ana, luis } = await joinedCouple();
	await luis.as.mutation(api.household.updateCycle, { cadence: "biweekly", cycleStartDay: 3 });
	expect((await ana.as.query(api.household.get, {}))?.cycle).toEqual({
		cadence: "biweekly",
		cycleStartDay: 3,
	});
	const home = await ana.as.query(api.balances.getHome, { space: household, today: TODAY });
	expect([home.startDate, home.endDate]).toEqual(["2026-10-20", "2026-11-14"]);

	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	const next = await ana.as.mutation(api.cycles.ensureOpen, { space: household });
	expect(next.startDate).toBe("2026-11-15");
	// The 15 to 17 Nov stretch is shorter than a week, so it joins the 18 Nov to 2 Dec period.
	expect(next.endDate).toBe("2026-12-02");
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	const own = await ana.as.query(api.balances.getHome, { space: "personal", today: "2026-11-16" });
	expect([own.startDate, own.endDate]).toEqual(["2026-11-15", "2026-12-14"]);

	await expect(
		ana.as.mutation(api.household.updateCycle, { cadence: "weekly", cycleStartDay: "last" }),
	).rejects.toThrow();
});

test("changing the split of the household moves only the household envelopes", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await luis.as.mutation(api.settings.updateSplit, {
		space: household,
		split: { needs: 40, wants: 40, savings: 20 },
	});
	const shared = await ana.as.query(api.balances.getHome, { space: household, today: TODAY });
	expect([shared.needsCents, shared.wantsCents]).toEqual([40_000, 40_000]);
	const own = await ana.as.query(api.balances.getHome, { space: "personal", today: TODAY });
	expect(own.split).toEqual({ needs: 60, wants: 20, savings: 20 });
});
