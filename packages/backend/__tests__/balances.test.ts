import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { splitIncome } from "../shared/budget";
import { type Harness, harness, signIn } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });

	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	const share = splitIncome(50_000, SPLIT);

	expect(balances).toEqual({
		needsCents: share.needsCents, // S/ 250.00
		wantsCents: share.wantsCents, // S/ 150.00
		savingsCents: share.savingsCents, // S/ 100.00
		dailyCents: 3333, // S/ 33.33
	});
	expect(balances.dailyCents).toBe(3333);
});

test("a pending commitment lowers only the daily number", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });

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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	// Ahorro went to the fund; Needs/Wants carried in. Nov has 30 days.
	expect(balances).toEqual({
		needsCents: 25_000,
		wantsCents: 15_000,
		savingsCents: 0,
		dailyCents: 1333,
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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });

	const day20 = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	const day26 = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-26" });

	// Free Needs + Wants is 400.00.
	expect(day20.daysLeft).toBe(12);
	expect(day20.dailyCents).toBe(3_333);
	expect(day26.daysLeft).toBe(6);
	expect(day26.dailyCents).toBe(6_666);
	expect(day20.empty).toBe(false);
	expect(day20.planIncomeCents).toBe(150_000);
});

test("getHome is not empty when income exists but every envelope is at 0", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });

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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });

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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });
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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(home.startDate).toBe("2026-10-20");
	expect(home.endDate).toBe("2026-10-31");
});

test("assigned is what the cycle received and does not drop when you spend", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });
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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });
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
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });
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
	await ana.mutation(api.profiles.completeOnboarding, {
		name: "Ana",
		...onboardOct20,
		todayCents: 0,
	});

	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(home.empty).toBe(true);
});

async function startAnaOct20(t: Harness) {
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });
	return ana;
}

const homeArgs = { space: "personal" as const, today: "2026-10-20" };

test("today's base holds still while you spend and each expense comes off it", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);

	// Free 400.00 with 12 days left: 33.33 a day.
	const first = await ana.query(api.balances.getHome, homeArgs);
	expect(first).toMatchObject({ dailyCents: 3_333, spentTodayCents: 0, leftCents: 3_333 });

	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 3_300,
		envelope: "needs",
	});
	const second = await ana.query(api.balances.getHome, homeArgs);
	expect(second).toMatchObject({
		dailyCents: 3_333,
		spentTodayCents: 3_300,
		leftCents: 33,
		overCents: 0,
		tomorrowCents: 3_336, // 367.00 over the 11 days that follow
	});

	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 1_000,
		envelope: "wants",
	});
	const third = await ana.query(api.balances.getHome, homeArgs);
	expect(third).toMatchObject({
		dailyCents: 3_333,
		spentTodayCents: 4_300,
		leftCents: 0,
		overCents: 967,
		tomorrowCents: 3_245, // 357.00 over 11 days
	});
});

test("an income today raises the base at once", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 1_000,
		envelope: "needs",
	});

	// S/ 120.00 at 50/30/20 puts 96.00 into Necesidades + Gustos: free goes from 390 to 486.
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 12_000 });

	const home = await ana.query(api.balances.getHome, homeArgs);
	expect(home).toMatchObject({ dailyCents: 4_133, spentTodayCents: 1_000, leftCents: 3_133 });
});

test("editing or deleting an expense from a day before changes today's base at once", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-19T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, { ...onboardOct20, name: "Ana" });
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 2_000,
		envelope: "needs",
	});

	vi.setSystemTime(new Date("2026-10-20T17:00:00.000Z"));
	// Free 380.00 over the 12 days left.
	expect(await ana.query(api.balances.getHome, homeArgs)).toMatchObject({
		dailyCents: 3_166,
		spentTodayCents: 0,
	});

	const { rows } = await ana.query(api.transactions.list, homeArgs);
	const yesterday = rows.filter((row) => row.kind === "expense")[0];
	await ana.mutation(api.transactions.updateExpense, {
		space: "personal",
		id: yesterday.id,
		amountCents: 5_000,
		envelope: "needs",
	});
	expect(await ana.query(api.balances.getHome, homeArgs)).toMatchObject({
		dailyCents: 2_916,
		spentTodayCents: 0,
	});

	await ana.mutation(api.transactions.deleteExpense, { space: "personal", id: yesterday.id });
	expect(await ana.query(api.balances.getHome, homeArgs)).toMatchObject({
		dailyCents: 3_333,
		spentTodayCents: 0,
	});
});

test("on the last day overspending shows no tomorrow", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);

	vi.setSystemTime(new Date("2026-10-31T17:00:00.000Z"));
	const args = { space: "personal" as const, today: "2026-10-31" };
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 25_000,
		envelope: "needs",
	});
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 17_000,
		envelope: "wants",
	});

	// All 400.00 was free this morning; 420.00 went out.
	const home = await ana.query(api.balances.getHome, args);
	expect(home).toMatchObject({
		daysLeft: 1,
		dailyCents: 40_000,
		leftCents: 0,
		overCents: 2_000,
		tomorrowCents: null,
	});
});

test("a negative free amount gives base 0 and spending that day only adds to what you went over", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	// Needs and Gustos both end October at −S/ 50.
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 30_000,
		envelope: "needs",
	});
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 20_000,
		envelope: "wants",
	});
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	const args = { space: "personal" as const, today: "2026-11-01" };

	expect(await ana.query(api.balances.getHome, args)).toMatchObject({
		dailyCents: 0,
		spentTodayCents: 0,
		leftCents: 0,
		overCents: 0,
		tomorrowCents: 0,
	});

	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 2_000,
		envelope: "wants",
	});
	expect(await ana.query(api.balances.getHome, args)).toMatchObject({
		dailyCents: 0,
		spentTodayCents: 2_000,
		leftCents: 0,
		overCents: 2_000,
		tomorrowCents: 0,
	});
});

test("a saving to a goal does not change the base", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	const goalId = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return ctx.db.insert("goals", { spaceId: space._id, name: "Viaje", targetCents: 100_000 });
	});

	await ana.mutation(api.transactions.addSaving, {
		space: "personal",
		amountCents: 5_000,
		goalId,
	});

	expect(await ana.query(api.balances.getHome, homeArgs)).toMatchObject({
		dailyCents: 3_333,
		spentTodayCents: 0,
	});
});
