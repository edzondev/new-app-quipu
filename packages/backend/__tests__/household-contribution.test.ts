import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { daysBetween } from "../shared/dates";
import { DAY, householdSpaceId, joinedCouple, setTrialEnd, TODAY } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const DAYS_LEFT = daysBetween(TODAY, "2026-11-14") + 1;
const READ_ONLY = "Solo lectura. Activa Plus para seguir anotando.";

type Pair = Awaited<ReturnType<typeof joinedCouple>>;
type Person = Pair["ana"];

function home(person: Person, space: "personal" | "household", today = TODAY) {
	return person.as.query(api.balances.getHome, { space, today });
}

async function contributionId(person: Person) {
	const { rows } = await person.as.query(api.transactions.list, {
		space: "personal",
		today: TODAY,
	});
	const row = rows.find((r) => r.kind === "contribution");
	if (!row) throw new Error("missing contribution");
	return row.id;
}

test("an aporte lowers Personal and raises the household from that moment, and is nobody's spending today", async () => {
	const { ana } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 10_400,
		envelope: "needs",
		toEnvelope: "savings",
	});

	const personal = await home(ana, "personal");
	expect(personal.needsCents).toBe(19_600);
	expect(personal.dailyCents).toBe(Math.floor((40_000 - 10_400) / DAYS_LEFT));
	expect(personal.spentTodayCents).toBe(0);

	const together = await home(ana, "household");
	expect(together.savingsCents).toBe(10_400);
	expect(together.spentTodayCents).toBe(0);
	expect(together.empty).toBe(false);
});

test("an aporte to Necesidades of the household raises its number for today", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 26_000,
		envelope: "needs",
		toEnvelope: "needs",
	});
	const together = await home(luis, "household");
	expect(together.needsCents).toBe(26_000);
	expect(together.dailyCents).toBe(1_000);
	expect(together.assigned.needsCents).toBe(26_000);
});

test("an aporte larger than what is left in the envelope is allowed", async () => {
	const { ana } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 15_000,
		envelope: "wants",
		toEnvelope: "wants",
	});
	expect((await home(ana, "personal")).wantsCents).toBe(-5_000);
});

test("without Plus in the household the aporte is refused and Personal does not change", async () => {
	const { t, ana, luis } = await joinedCouple();
	await setTrialEnd(t, ana.userId, Date.now() - DAY);
	await setTrialEnd(t, luis.userId, Date.now() - DAY);
	await expect(
		ana.as.mutation(api.transactions.addContribution, {
			amountCents: 5_000,
			envelope: "needs",
			toEnvelope: "needs",
		}),
	).rejects.toThrow(READ_ONLY);
	expect((await home(ana, "personal")).needsCents).toBe(30_000);
});

test("editing an aporte moves the difference in both spaces, and changes its envelopes", async () => {
	const { ana } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 10_000,
		envelope: "needs",
		toEnvelope: "needs",
	});
	await ana.as.mutation(api.transactions.updateContribution, {
		id: await contributionId(ana),
		amountCents: 4_000,
		envelope: "wants",
		toEnvelope: "savings",
	});
	const personal = await home(ana, "personal");
	expect([personal.needsCents, personal.wantsCents]).toEqual([30_000, 6_000]);
	const together = await home(ana, "household");
	expect([together.needsCents, together.savingsCents]).toEqual([0, 4_000]);
});

test("deleting an aporte gives the money back to both envelopes", async () => {
	const { ana } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 10_000,
		envelope: "wants",
		toEnvelope: "needs",
	});
	await ana.as.mutation(api.transactions.deleteContribution, { id: await contributionId(ana) });
	expect((await home(ana, "personal")).wantsCents).toBe(10_000);
	expect((await home(ana, "household")).needsCents).toBe(0);
});

test("the partner cannot delete someone else's aporte", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 10_000,
		envelope: "needs",
		toEnvelope: "needs",
	});
	await expect(
		luis.as.mutation(api.transactions.deleteContribution, { id: await contributionId(ana) }),
	).rejects.toThrow();
	expect((await home(ana, "household")).needsCents).toBe(10_000);
});

test("an aporte cannot be deleted once the household already took that Ahorro to the fund", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 10_000,
		envelope: "needs",
		toEnvelope: "savings",
	});
	await luis.as.mutation(api.transactions.addSaving, { space: "household", amountCents: 6_000 });
	await expect(
		ana.as.mutation(api.transactions.deleteContribution, { id: await contributionId(ana) }),
	).rejects.toThrow(
		"No puedes borrar este aporte: en Nuestro espacio ya retiraron S/ 60.00 de ese Ahorro.",
	);
});

test("an aporte cannot be changed after the household cycle closed", async () => {
	const { t, ana } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 10_000,
		envelope: "needs",
		toEnvelope: "needs",
	});
	const id = await contributionId(ana);
	const spaceId = await householdSpaceId(t);
	await t.run(async (ctx) => {
		await ctx.db.patch("spaces", spaceId, { cycleStartDay: 20 });
		const cycle = await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", spaceId))
			.first();
		if (cycle) {
			await ctx.db.patch("cycles", cycle._id, { startDate: "2026-09-20", endDate: "2026-10-19" });
		}
	});
	await expect(ana.as.mutation(api.transactions.deleteContribution, { id })).rejects.toThrow(
		"Este aporte ya no se puede cambiar: el ciclo de Nuestro espacio cerró.",
	);
	expect((await home(ana, "personal")).needsCents).toBe(20_000);
});

test("Aportes del ciclo adds each person's incomes and aportes", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: "household", amountCents: 20_000 });
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 5_000,
		envelope: "needs",
		toEnvelope: "needs",
	});
	await luis.as.mutation(api.transactions.addContribution, {
		amountCents: 7_000,
		envelope: "wants",
		toEnvelope: "savings",
	});
	expect(await ana.as.query(api.household.contributions, { today: TODAY })).toEqual({
		mineCents: 25_000,
		partnerCents: 7_000,
	});
});

test("the household lists the partner's aporte with its household envelope, Personal with both", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 5_000,
		envelope: "wants",
		toEnvelope: "savings",
		note: "Para el viaje",
	});
	const together = await luis.as.query(api.transactions.list, {
		space: "household",
		today: TODAY,
	});
	expect(together.rows).toEqual([
		expect.objectContaining({
			kind: "contribution",
			amountCents: 5_000,
			envelope: "savings",
			toEnvelope: "savings",
			who: "Camila",
			mine: false,
			note: "Para el viaje",
		}),
	]);
	const personal = await ana.as.query(api.transactions.list, { space: "personal", today: TODAY });
	expect(personal.rows[0]).toMatchObject({
		kind: "contribution",
		envelope: "wants",
		toEnvelope: "savings",
	});
});

test("with an aporte both cycles close with a summary that adds up", async () => {
	const { t, ana } = await joinedCouple();
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 10_000,
		envelope: "needs",
		toEnvelope: "needs",
	});
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "personal" });
	await ana.as.mutation(api.cycles.ensureOpen, { space: "household" });
	const summaries = await t.run(async (ctx) =>
		(await ctx.db.query("cycles").take(10))
			.filter((cycle) => cycle.closedAt !== undefined)
			.map((cycle) => cycle.closeSummary?.status),
	);
	expect(summaries).toEqual(["ok", "ok"]);
});

test("a household that only got an aporte is not empty and is not deleted to join another", async () => {
	const { ana } = await joinedCouple().then(async (pair) => {
		await pair.luis.as.mutation(api.household.leaveHousehold, {});
		return pair;
	});
	await ana.as.mutation(api.transactions.addContribution, {
		amountCents: 5_000,
		envelope: "needs",
		toEnvelope: "needs",
	});
	expect(await ana.as.query(api.household.isEmpty, {})).toBe(false);
});
