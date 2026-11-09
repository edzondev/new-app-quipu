import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { couple, DAY, householdSpaceId, joinedCouple, setTrialEnd } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const household = "household" as const;
const AFTER_CLOSE = "2026-11-16";

/** Household with S/ 1,000 of income (50·30·20) and the given spending; then the clock passes the cycle end. */
async function closedHousehold(spend: { needs: number; wants: number }) {
	const pair = await joinedCouple();
	const { ana, luis } = pair;
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	if (spend.needs > 0) {
		await luis.as.mutation(api.transactions.addExpense, {
			space: household,
			amountCents: spend.needs,
			envelope: "needs",
		});
	}
	if (spend.wants > 0) {
		await ana.as.mutation(api.transactions.addExpense, {
			space: household,
			amountCents: spend.wants,
			envelope: "wants",
		});
	}
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: household });
	return pair;
}

async function envelopesAfterClose(pair: Awaited<ReturnType<typeof closedHousehold>>) {
	const home = await pair.ana.as.query(api.balances.getHome, {
		space: household,
		today: AFTER_CLOSE,
	});
	return [home.needsCents, home.wantsCents, home.savingsCents];
}

test("a surplus of Necesidades and Gustos together goes to the Ahorro of the new cycle", async () => {
	const pair = await closedHousehold({ needs: 10_000, wants: 20_000 });
	// 40,000 + 10,000 left; Ahorro 20,000 went to the fund.
	expect(await envelopesAfterClose(pair)).toEqual([0, 0, 50_000]);
	const fund = await pair.ana.as.query(api.goals.fund, { space: household, today: AFTER_CLOSE });
	expect(fund.fundCents).toBe(20_000);
});

test("a deficit is not carried and nothing goes to Ahorro", async () => {
	const pair = await closedHousehold({ needs: 60_000, wants: 35_000 });
	expect(await envelopesAfterClose(pair)).toEqual([0, 0, 0]);
	const notice = await pair.luis.as.query(api.cycles.getUnseenClosed, { space: household });
	expect(notice).toMatchObject({ surplusCents: 0, shortfallCents: 15_000, carriedCents: 0 });
});

test("an envelope below zero is netted against the other one", async () => {
	const pair = await closedHousehold({ needs: 70_000, wants: 0 });
	// Necesidades -20,000 and Gustos +30,000: +10,000 together.
	expect(await envelopesAfterClose(pair)).toEqual([0, 0, 10_000]);
	const notice = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household });
	expect(notice).toMatchObject({ surplusCents: 10_000, shortfallCents: 0 });
});

test("a deficit with amounts of different sign is told as the net and not carried", async () => {
	// Necesidades 50,000 - 80,000 = -30,000 and Gustos 30,000 - 10,000 = +20,000: -10,000 together.
	const pair = await closedHousehold({ needs: 80_000, wants: 10_000 });
	expect(await envelopesAfterClose(pair)).toEqual([0, 0, 0]);
	const notice = await pair.luis.as.query(api.cycles.getUnseenClosed, { space: household });
	expect(notice).toMatchObject({ surplusCents: 0, shortfallCents: 10_000 });
});

test("a net of exactly zero moves nothing", async () => {
	const pair = await closedHousehold({ needs: 50_000, wants: 30_000 });
	expect(await envelopesAfterClose(pair)).toEqual([0, 0, 0]);
	const notice = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household });
	expect(notice).toMatchObject({ surplusCents: 0, shortfallCents: 0 });
});

test("the free Ahorro goes to the fund once, even if both open the app", async () => {
	const pair = await joinedCouple();
	await pair.ana.as.mutation(api.transactions.addIncome, {
		space: household,
		amountCents: 100_000,
	});
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await Promise.all([
		pair.ana.as.mutation(api.cycles.ensureOpen, { space: household }),
		pair.luis.as.mutation(api.cycles.ensureOpen, { space: household }),
	]);
	await pair.luis.as.mutation(api.cycles.ensureOpen, { space: household });

	const fund = await pair.ana.as.query(api.goals.fund, { space: household, today: AFTER_CLOSE });
	expect(fund.fundCents).toBe(20_000);
	const spaceId = await householdSpaceId(pair.t);
	const { savings, cycles } = await pair.t.run(async (ctx) => ({
		savings: await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", spaceId).eq("kind", "saving"))
			.take(10),
		cycles: await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", spaceId))
			.take(10),
	}));
	expect(savings).toHaveLength(1);
	expect(cycles).toHaveLength(2);
});

test("a close with movements from both is consistent and matches what was left", async () => {
	const pair = await closedHousehold({ needs: 10_000, wants: 20_000 });
	const spaceId = await householdSpaceId(pair.t);
	const first = await pair.t.run(async (ctx) =>
		ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", spaceId))
			.first(),
	);
	expect(first?.closeSummary).toEqual({
		status: "ok",
		assigned: { needsCents: 50_000, wantsCents: 30_000 },
		spent: { needsCents: 10_000, wantsCents: 20_000 },
		fundedCents: 20_000,
	});
});

test("Personal is not changed: it still carries Necesidades and Gustos, even below zero", async () => {
	const pair = await joinedCouple();
	// Personal: S/ 500 at 60·20·20 -> Necesidades 300, Gustos 100.
	await pair.ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 40_000,
		envelope: "needs",
	});
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await pair.ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	const own = await pair.ana.as.query(api.balances.getHome, {
		space: "personal",
		today: AFTER_CLOSE,
	});
	expect([own.needsCents, own.wantsCents, own.savingsCents]).toEqual([-10_000, 10_000, 0]);
});

test("an income saved for the next cycle moves to it whole and does not count in the surplus", async () => {
	const pair = await joinedCouple();
	vi.setSystemTime(new Date("2026-11-13T17:00:00.000Z"));
	await setTrialEnd(pair.t, pair.ana.userId, Date.now() + 60 * DAY);
	await pair.ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 40_000 });
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await pair.ana.as.mutation(api.cycles.ensureOpen, { space: household });
	expect(await envelopesAfterClose(pair)).toEqual([20_000, 12_000, 8_000]);
	const notice = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household });
	expect(notice).toMatchObject({ surplusCents: 0, shortfallCents: 0 });
});

test("the household closes with the Plus lapsed", async () => {
	const pair = await joinedCouple();
	await pair.ana.as.mutation(api.transactions.addIncome, {
		space: household,
		amountCents: 100_000,
	});
	await setTrialEnd(pair.t, pair.ana.userId, Date.now() - DAY);
	await setTrialEnd(pair.t, pair.luis.userId, Date.now() - DAY);
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	const next = await pair.luis.as.mutation(api.cycles.ensureOpen, { space: household });
	expect(next.startDate).toBe("2026-11-15");
});

test("each one dismisses their own notice of the household close", async () => {
	const pair = await closedHousehold({ needs: 10_000, wants: 0 });
	const forAna = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household });
	const forLuis = await pair.luis.as.query(api.cycles.getUnseenClosed, { space: household });
	expect(forAna).not.toBeNull();
	expect(forLuis?.cycleId).toBe(forAna?.cycleId);
	if (!forAna) throw new Error("missing notice");

	await pair.ana.as.mutation(api.cycles.markClosedSeen, { cycleId: forAna.cycleId });
	expect(await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household })).toBeNull();
	expect(await pair.luis.as.query(api.cycles.getUnseenClosed, { space: household })).not.toBeNull();
});

test("dismissing the household notice does not dismiss the Personal one, and the other way round", async () => {
	const pair = await joinedCouple();
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await pair.ana.as.mutation(api.cycles.ensureOpen, { space: household });
	await pair.ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	const shared = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household });
	const own = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: "personal" });
	if (!shared || !own) throw new Error("missing notices");

	await pair.ana.as.mutation(api.cycles.markClosedSeen, { cycleId: shared.cycleId });
	expect(await pair.ana.as.query(api.cycles.getUnseenClosed, { space: "personal" })).not.toBeNull();
	await pair.ana.as.mutation(api.cycles.markClosedSeen, { cycleId: own.cycleId });
	expect(await pair.ana.as.query(api.cycles.getUnseenClosed, { space: "personal" })).toBeNull();
	expect(await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household })).toBeNull();
});

test("a close of another space does not cover this one, even with a later date", async () => {
	const pair = await joinedCouple();
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await pair.ana.as.mutation(api.cycles.ensureOpen, { space: household });
	await pair.ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	const shared = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household });
	const own = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: "personal" });
	if (!shared || !own) throw new Error("missing notices");

	// She "saw" a Personal close in the household slot, with the same end date.
	await pair.t.run(async (ctx) => {
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", pair.ana.userId))
			.unique();
		if (!profile) throw new Error("missing profile");
		await ctx.db.patch("profiles", profile._id, { lastSeenHouseholdClosedCycleId: own.cycleId });
	});
	await pair.ana.as.mutation(api.cycles.markClosedSeen, { cycleId: shared.cycleId });
	expect(await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household })).toBeNull();
});

test("a notice only moves forward: dismissing an older close does not bring back the newer one", async () => {
	const pair = await joinedCouple();
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	const firstNotice = await (async () => {
		await pair.ana.as.mutation(api.cycles.ensureOpen, { space: household });
		return await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household });
	})();
	vi.setSystemTime(new Date("2026-12-16T17:00:00.000Z"));
	await pair.ana.as.mutation(api.cycles.ensureOpen, { space: household });
	const latest = await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household });
	if (!firstNotice || !latest) throw new Error("missing notices");
	expect(latest.cycleId).not.toBe(firstNotice.cycleId);

	await pair.ana.as.mutation(api.cycles.markClosedSeen, { cycleId: latest.cycleId });
	await pair.ana.as.mutation(api.cycles.markClosedSeen, { cycleId: firstNotice.cycleId });
	expect(await pair.ana.as.query(api.cycles.getUnseenClosed, { space: household })).toBeNull();
});

test("who joins after a close does not see it", async () => {
	const { ana, luis } = await couple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: household });
	const { code } = await ana.as.mutation(api.household.createInvite, {});
	expect(await luis.as.mutation(api.household.joinHousehold, { code })).toEqual({ ok: true });

	expect(await luis.as.query(api.cycles.getUnseenClosed, { space: household })).toBeNull();
	expect(await ana.as.query(api.cycles.getUnseenClosed, { space: household })).not.toBeNull();
});
