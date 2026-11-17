import type { WithoutSystemFields } from "convex/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { GIFT_MS } from "../shared/billing";
import { type Harness, harness, onboardUser, signUp, START, TODAY } from "./couple";

type ImportRow = WithoutSystemFields<Doc<"migrationImports">>;

const EMAIL = "camila@correo.com";

beforeEach(() => {
	vi.useFakeTimers({ now: new Date(START) });
});

afterEach(() => {
	vi.useRealTimers();
});

/**
 * Camila as she comes from the old app, invented: monthly from the 1st, 50/30/20. September closed
 * with S/ 100 and S/ 50 left, which October carries; October got S/ 500 and spent S/ 50.
 */
function camila(over: Partial<ImportRow> = {}): ImportRow {
	return {
		email: EMAIL,
		status: "pending",
		name: "Camila Rojas",
		plan: { cadence: "monthly", cycleStartDay: 1, incomeCents: 50_000 },
		split: { needs: 50, wants: 30, savings: 20 },
		fundCents: 30_000,
		closed: [
			{
				startDate: "2026-09-01",
				endDate: "2026-09-30",
				closedAt: Date.parse("2026-10-01T05:00:00.000Z"),
				envelopes: { needsCents: 10_000, wantsCents: 5_000, savingsCents: 20_000 },
				carryIn: { needsCents: 0, wantsCents: 0 },
				rows: [
					{
						kind: "income",
						amountCents: 100_000,
						date: "2026-09-01",
						allocation: { needsCents: 50_000, wantsCents: 30_000, savingsCents: 20_000 },
					},
					{ kind: "expense", amountCents: 40_000, date: "2026-09-10", envelope: "needs" },
					{ kind: "expense", amountCents: 25_000, date: "2026-09-12", envelope: "wants" },
				],
			},
		],
		open: {
			startDate: "2026-10-01",
			envelopes: { needsCents: 30_000, wantsCents: 20_000, savingsCents: 30_000 },
			carryIn: { needsCents: 10_000, wantsCents: 5_000 },
			rows: [
				{
					kind: "income",
					amountCents: 50_000,
					date: "2026-10-01",
					allocation: { needsCents: 25_000, wantsCents: 15_000, savingsCents: 10_000 },
				},
				{
					kind: "expense",
					amountCents: 5_000,
					date: "2026-10-05",
					envelope: "needs",
					note: "Pasajes",
				},
			],
		},
		goals: [
			{ name: "Viaje a Cusco", targetCents: 100_000, savedCents: 20_000 },
			{ name: "Laptop", targetCents: 300_000, savedCents: 0 },
			{ name: "Curso", targetCents: 50_000, savedCents: 50_000 },
		],
		commitments: [{ name: "Alquiler", amountCents: 20_000, envelope: "needs", day: 25 }],
		...over,
	};
}

async function load(t: Harness, row: ImportRow) {
	await t.run(async (ctx) => {
		await ctx.db.insert("migrationImports", row);
	});
}

function importOf(t: Harness) {
	return t.run((ctx) =>
		ctx.db
			.query("migrationImports")
			.withIndex("by_email", (q) => q.eq("email", EMAIL))
			.unique(),
	);
}

function countRows(t: Harness) {
	return t.run(async (ctx) => {
		const [cycles, transactions, goals, commitments] = await Promise.all([
			ctx.db.query("cycles").take(100),
			ctx.db.query("transactions").take(100),
			ctx.db.query("goals").take(100),
			ctx.db.query("commitments").take(100),
		]);
		return [cycles.length, transactions.length, goals.length, commitments.length];
	});
}

async function closeSummaryStatus(t: Harness) {
	const cycle = await t.run((ctx) => ctx.db.query("cycles").order("asc").first());
	return cycle?.closeSummary?.status;
}

/** Loads Camila's row and signs her in for the first time, on 20 oct. */
async function arrive(over: Partial<ImportRow> = {}) {
	const t = harness();
	await load(t, camila(over));
	const user = await signUp(t, EMAIL, "Camila");
	return { t, ...user };
}

test("someone from the old app signs in and lands with their plan, name and Plus, without Primeros pasos", async () => {
	const { as } = await arrive();
	expect(await as.query(api.profiles.myProfile, {})).toMatchObject({
		name: "Camila Rojas",
		plan: { cadence: "monthly", cycleStartDay: 1, incomeCents: 50_000 },
		hasPlus: true,
		plusHistory: "none",
		welcomeSeen: true,
	});
	expect(await as.query(api.billing.status, {})).toEqual({
		kind: "gift",
		endsAt: Date.parse(START) + GIFT_MS,
	});
});

test("their envelopes are the ones they had, in a cycle that runs to the end of this period", async () => {
	const { as } = await arrive();
	expect(await as.query(api.balances.getHome, { space: "personal", today: TODAY })).toMatchObject({
		startDate: "2026-10-01",
		endDate: "2026-10-31",
		needsCents: 30_000,
		wantsCents: 20_000,
		savingsCents: 30_000,
		planIncomeCents: 50_000,
	});
});

test("their fund, every goal with what it had saved, and their commitments are there", async () => {
	const { as } = await arrive();
	expect(await as.query(api.goals.fund, { space: "personal", today: TODAY })).toMatchObject({
		fundCents: 30_000,
	});
	expect(await as.query(api.goals.list, { space: "personal" })).toMatchObject([
		{ name: "Viaje a Cusco", targetCents: 100_000, savedCents: 20_000 },
		{ name: "Laptop", targetCents: 300_000, savedCents: 0 },
		{ name: "Curso", targetCents: 50_000, savedCents: 50_000 },
	]);
	const { items } = await as.query(api.commitments.list, { space: "personal", today: TODAY });
	expect(items).toMatchObject([
		{ name: "Alquiler", amountCents: 20_000, envelope: "needs", dueDate: "2026-10-25" },
	]);
});

test("their movements of the open cycle are listed, newest first", async () => {
	const { as } = await arrive();
	const { rows } = await as.query(api.transactions.list, { space: "personal", today: TODAY });
	expect(rows).toMatchObject([
		{ kind: "expense", amountCents: 5_000, date: "2026-10-05", note: "Pasajes", mine: true },
		{ kind: "income", amountCents: 50_000, date: "2026-10-01" },
	]);
});

test("the three goals they bring do not stop a fourth one while the gift lasts", async () => {
	const { as } = await arrive();
	await as.mutation(api.goals.add, { space: "personal", name: "Bici", targetCents: 80_000 });
	expect(await as.query(api.goals.list, { space: "personal" })).toHaveLength(4);
});

test("a close that happened in the old app shows no close notice here", async () => {
	const { as } = await arrive();
	expect(await as.query(api.cycles.getUnseenClosed, { space: "personal" })).toBeNull();
});

test("a closed cycle whose movements add up to its balance is summarized", async () => {
	const { t } = await arrive();
	expect(await closeSummaryStatus(t)).toBe("ok");
});

test("a closed cycle that does not add up keeps its stored balance and is marked as such", async () => {
	const row = camila();
	row.closed[0].envelopes.needsCents = 12_345;
	const { t } = await arrive({ closed: row.closed });
	expect(await closeSummaryStatus(t)).toBe("inconsistent");
	const cycle = await t.run((ctx) => ctx.db.query("cycles").order("asc").first());
	expect(cycle?.envelopes.needsCents).toBe(12_345);
});

test("claiming again brings nothing twice, and the row keeps no money data", async () => {
	const { t, userId } = await arrive();
	const before = await countRows(t);
	await t.mutation(internal.migration.claim, { userId, email: EMAIL });
	expect(await countRows(t)).toEqual(before);
	expect(await importOf(t)).toMatchObject({
		status: "claimed",
		claimedBy: userId,
		name: "",
		fundCents: 0,
		closed: [],
		goals: [],
		commitments: [],
	});
	expect(await t.query(internal.migration.status, {})).toEqual({ claimed: 1, conflict: 0 });
});

test("an email with no row goes through Primeros pasos as always", async () => {
	const t = harness();
	const { as } = await signUp(t, EMAIL, "Camila");
	expect(await as.query(api.profiles.myProfile, {})).toMatchObject({ plan: null, hasPlus: false });
});

test("someone who never started a cycle gets the gift and still goes through Primeros pasos", async () => {
	const { as } = await arrive({
		plan: undefined,
		open: undefined,
		closed: [],
		goals: [],
		commitments: [],
	});
	expect(await as.query(api.profiles.myProfile, {})).toMatchObject({
		plan: null,
		hasPlus: true,
		welcomeSeen: false,
	});
});

test("a row that cannot be claimed does not stop the person from signing in, and stays pending", async () => {
	const { t, as } = await arrive({ plan: { cadence: "monthly", cycleStartDay: 99 } });
	expect(await as.query(api.profiles.myProfile, {})).toMatchObject({ plan: null, hasPlus: false });
	expect(await importOf(t)).toMatchObject({ status: "pending" });
	expect(await countRows(t)).toEqual([0, 0, 0, 0]);
});

test("claimExisting brings the data of someone who already had an account without a plan", async () => {
	const t = harness();
	const { as } = await signUp(t, EMAIL, "Camila");
	await load(t, camila());
	await t.mutation(internal.migration.claimExisting, {});
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	expect(await as.query(api.profiles.myProfile, {})).toMatchObject({
		plan: { cadence: "monthly", cycleStartDay: 1 },
		hasPlus: true,
	});
});

test("claimExisting never mixes with a space the person already has: the row is a conflict", async () => {
	const t = harness();
	const { as } = await onboardUser(t, EMAIL, "Camila Rojas");
	const before = await countRows(t);
	await load(t, camila());
	await t.mutation(internal.migration.claimExisting, {});
	await t.finishAllScheduledFunctions(vi.runAllTimers);
	expect(await importOf(t)).toMatchObject({ status: "conflict" });
	expect(await countRows(t)).toEqual(before);
	expect(await as.query(api.profiles.myProfile, {})).toMatchObject({ hasPlus: false });
	expect(await t.query(internal.migration.status, {})).toEqual({ claimed: 0, conflict: 1 });
});
