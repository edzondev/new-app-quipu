import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import { ensureOpenCycle } from "../convex/model/cycles";
import { getSplitPreview } from "../shared/preview";
import { type Harness, harness, signIn } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

type Person = Awaited<ReturnType<typeof signIn>>;

// Ana's base case: 20 Oct, S/ 500 today, monthly from the 1st, 50/30/20 → N 250, G 150, A 100.
const ANA_PLAN = { cadence: "monthly" as const, cycleStartDay: 1, incomeCents: 150_000 };
const onboard = { ...ANA_PLAN, todayCents: 50_000, split: { needs: 50, wants: 30, savings: 20 } };
const SPLIT_40 = { needs: 40, wants: 40, savings: 20 };

// Sign in under the fake clock (convex-test never lets _creationTime go back) and stretch the
// 7-day session so the test can reach November.
async function startAna(t: Harness, email = "ana@correo.com", name = "Ana") {
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const person = await signIn(t, email, name);
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	await t.mutation(components.betterAuth.adapter.updateOne, {
		input: {
			model: "session",
			where: [{ field: "userId", value: user._id }],
			update: { expiresAt: Date.UTC(2027, 0, 1) },
		},
	});
	await person.mutation(api.profiles.completeOnboarding, { ...onboard, name });
	return person;
}

function addLuz(person: Person) {
	return person.mutation(api.commitments.add, {
		space: "personal",
		name: "Luz",
		amountCents: 5_000,
		envelope: "needs",
		schedule: { frequency: "monthly", rule: { kind: "day", day: 25 } },
	});
}

async function payLuz(t: Harness, person: Person) {
	const id = await t.run(async (ctx) => (await ctx.db.query("commitments").take(1))[0]._id);
	await person.mutation(api.commitments.markPaid, { space: "personal", id });
}

function spend(person: Person, amountCents: number, envelope: "needs" | "wants") {
	return person.mutation(api.transactions.addExpense, { space: "personal", amountCents, envelope });
}

function getHome(person: Person, today: string) {
	return person.query(api.balances.getHome, { space: "personal", today });
}

type Home = Awaited<ReturnType<typeof getHome>>;

function envelopesOf({ needsCents, wantsCents, savingsCents }: Home) {
	return { needsCents, wantsCents, savingsCents };
}

// What Ajustes does: preview from Inicio's numbers, save, then read Inicio again.
async function saveSplit(person: Person, today: string, split: typeof SPLIT_40) {
	const before = await getHome(person, today);
	const preview = getSplitPreview({
		envelopes: envelopesOf(before),
		reserved: before.reserved,
		split,
		spentTodayCents: before.spentTodayCents,
		daysLeft: before.daysLeft,
	});
	await person.mutation(api.settings.updateSplit, { space: "personal", split });
	const after = await getHome(person, today);
	expect(preview).toEqual({ envelopes: envelopesOf(after), leftCents: after.leftCents });
	return { before, after };
}

// ── Reparto: lo reservado se queda en su sobre y nada se descuenta dos veces ─────────────────

test("a pending commitment stays in Needs when the split changes", async () => {
	const t = harness();
	const ana = await startAna(t);
	await addLuz(ana);

	const { before, after } = await saveSplit(ana, "2026-10-20", SPLIT_40);

	expect(before.split).toEqual({ needs: 50, wants: 30, savings: 20 });
	expect(before.reserved).toEqual({ needsCents: 5_000, wantsCents: 0, savingsCents: 0 });
	expect(before.dailyCents).toBe(2_916);
	expect(envelopesOf(after)).toEqual({
		needsCents: 23_000,
		wantsCents: 18_000,
		savingsCents: 9_000,
	});
	expect(after.dailyCents).toBe(3_000);
	expect(after.split).toEqual(SPLIT_40);
});

test("a pending commitment in Gustos stays in Gustos", async () => {
	const t = harness();
	const ana = await startAna(t);
	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Netflix",
		amountCents: 3_000,
		envelope: "wants",
		schedule: { frequency: "monthly", rule: { kind: "day", day: 25 } },
	});

	const { before, after } = await saveSplit(ana, "2026-10-20", SPLIT_40);

	expect(before.reserved).toEqual({ needsCents: 0, wantsCents: 3_000, savingsCents: 0 });
	expect(before.dailyCents).toBe(3_083);
	expect(envelopesOf(after)).toEqual({
		needsCents: 18_800,
		wantsCents: 21_800,
		savingsCents: 9_400,
	});
	expect(after.dailyCents).toBe(3_133);
});

test("a paid commitment is not discounted twice", async () => {
	const t = harness();
	const ana = await startAna(t);
	await addLuz(ana);
	await payLuz(t, ana);

	const { before, after } = await saveSplit(ana, "2026-10-20", SPLIT_40);

	expect(before.reserved).toEqual({ needsCents: 0, wantsCents: 0, savingsCents: 0 });
	expect(envelopesOf(before)).toEqual({
		needsCents: 20_000,
		wantsCents: 15_000,
		savingsCents: 10_000,
	});
	expect(envelopesOf(after)).toEqual({
		needsCents: 18_000,
		wantsCents: 18_000,
		savingsCents: 9_000,
	});
	expect(after.dailyCents).toBe(3_000);
});

test("an earlier expense in Gustos is not discounted again", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, 10_000, "wants");

	const { before, after } = await saveSplit(ana, "2026-10-20", SPLIT_40);

	// Free 300.00 now, 100.00 spent today: 400.00 over 12 days.
	expect(before.dailyCents).toBe(3_333);
	expect(envelopesOf(after)).toEqual({
		needsCents: 16_000,
		wantsCents: 16_000,
		savingsCents: 8_000,
	});
	expect(after.dailyCents).toBe(3_500); // (320.00 + 100.00) / 12
});

test("a negative Necesidades does not make the daily number zero by itself", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, 30_000, "needs");

	const { before, after } = await saveSplit(ana, "2026-10-20", SPLIT_40);

	expect(envelopesOf(before)).toEqual({
		needsCents: -5_000,
		wantsCents: 15_000,
		savingsCents: 10_000,
	});
	expect(before.dailyCents).toBe(3_333); // (100.00 + 300.00) / 12
	expect(envelopesOf(after)).toEqual({
		needsCents: 5_000,
		wantsCents: 10_000,
		savingsCents: 5_000,
	});
	expect(after.dailyCents).toBe(3_750); // (150.00 + 300.00) / 12
});

test("spending today that leaves Necesidades plus Gustos below zero keeps this morning's base", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, 45_000, "needs");

	const { before, after } = await saveSplit(ana, "2026-10-20", SPLIT_40);

	expect(before.dailyCents).toBe(3_333); // free was 400.00 this morning
	expect(envelopesOf(after)).toEqual({
		needsCents: -10_000,
		wantsCents: 10_000,
		savingsCents: 5_000,
	});
	expect(after.dailyCents).toBe(3_750); // (0 + 450.00) / 12
});

test("an overdue unpaid commitment stays reserved when the split changes", async () => {
	const t = harness();
	const ana = await startAna(t);
	await addLuz(ana);
	vi.setSystemTime(new Date("2026-10-26T17:00:00.000Z"));

	const { before, after } = await saveSplit(ana, "2026-10-26", SPLIT_40);

	// 6 days left. Luz overdue since the 25th.
	expect(before.dailyCents).toBe(5_833);
	expect(envelopesOf(after)).toEqual({
		needsCents: 23_000,
		wantsCents: 18_000,
		savingsCents: 9_000,
	});
	expect(after.dailyCents).toBe(6_000);
});

test("saving the same split twice leaves the same state", async () => {
	const t = harness();
	const ana = await startAna(t);
	await addLuz(ana);

	const first = await saveSplit(ana, "2026-10-20", SPLIT_40);
	const second = await saveSplit(ana, "2026-10-20", SPLIT_40);

	expect(envelopesOf(first.after)).toEqual({
		needsCents: 23_000,
		wantsCents: 18_000,
		savingsCents: 9_000,
	});
	expect(envelopesOf(second.after)).toEqual(envelopesOf(first.after));
	expect(second.after.dailyCents).toBe(3_000);
});

test("a split that does not add up to 100 is rejected and the cycle does not change", async () => {
	const t = harness();
	const ana = await startAna(t);

	await expect(
		ana.mutation(api.settings.updateSplit, {
			space: "personal",
			split: { needs: 40, wants: 40, savings: 10 },
		}),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	const home = await getHome(ana, "2026-10-20");
	expect(home.split).toEqual({ needs: 50, wants: 30, savings: 20 });
	expect(envelopesOf(home)).toEqual({
		needsCents: 25_000,
		wantsCents: 15_000,
		savingsCents: 10_000,
	});
});

test("changing my split leaves another person's cycle alone", async () => {
	const t = harness();
	const ana = await startAna(t);
	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Luis" });

	await ana.mutation(api.settings.updateSplit, { space: "personal", split: SPLIT_40 });

	expect((await getHome(ana, "2026-10-20")).split).toEqual(SPLIT_40);
	const luisHome = await getHome(luis, "2026-10-20");
	expect(luisHome.split).toEqual({ needs: 50, wants: 30, savings: 20 });
	expect(envelopesOf(luisHome)).toEqual({
		needsCents: 25_000,
		wantsCents: 15_000,
		savingsCents: 10_000,
	});
});

// ── Ciclo: el cambio queda pendiente y aplica al siguiente ───────────────────────────────────

const WEEKLY_MONDAY = { cadence: "weekly" as const, cycleStartDay: 1, incomeCents: 150_000 };
const MONTHLY_15 = { cadence: "monthly" as const, cycleStartDay: 15, incomeCents: 150_000 };

test("a cycle change stays pending and leaves the current cycle, number and early-income window as they are", async () => {
	const t = harness();
	const ana = await startAna(t);
	await addLuz(ana);
	vi.setSystemTime(new Date("2026-10-29T17:00:00.000Z"));
	const before = await getHome(ana, "2026-10-29");

	await ana.mutation(api.settings.updatePlan, WEEKLY_MONDAY);

	const after = await getHome(ana, "2026-10-29");
	expect(after).toEqual(before);
	// Monthly window (last 3 days). With the weekly cadence it would be only the last day.
	expect(after.earlyWindow).toBe(true);
	const profile = await ana.query(api.profiles.myProfile, {});
	expect(profile?.plan).toEqual(ANA_PLAN);
	expect(profile?.nextPlan).toEqual(WEEKLY_MONDAY);
});

test("a person without a usual income can change the cycle, and the pending plan has none either", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.mutation(api.profiles.completeOnboarding, {
		name: "Ana",
		...onboard,
		incomeCents: undefined,
	});
	const weekly = { cadence: "weekly" as const, cycleStartDay: 1 };

	await ana.mutation(api.settings.updatePlan, weekly);

	const profile = await ana.query(api.profiles.myProfile, {});
	expect(profile?.nextPlan).toEqual(weekly);
	expect(profile?.nextPlan).not.toHaveProperty("incomeCents");
});

test("going back to the current plan removes the pending change", async () => {
	const t = harness();
	const ana = await startAna(t);
	await ana.mutation(api.settings.updatePlan, WEEKLY_MONDAY);

	await ana.mutation(api.settings.updatePlan, ANA_PLAN);

	const profile = await ana.query(api.profiles.myProfile, {});
	expect(profile?.nextPlan).toBeNull();
	expect(profile?.plan).toEqual(ANA_PLAN);
});

test("weekly cannot start on the last day and nothing is left pending", async () => {
	const t = harness();
	const ana = await startAna(t);

	await expect(
		ana.mutation(api.settings.updatePlan, { ...WEEKLY_MONDAY, cycleStartDay: "last" }),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");

	expect((await ana.query(api.profiles.myProfile, {}))?.nextPlan).toBeNull();
});

test("the pending change applies when the next cycle starts: the short stretch joins the next period", async () => {
	const t = harness();
	const ana = await startAna(t);
	await ana.mutation(api.settings.updatePlan, MONTHLY_15);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	const open = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	// 1 → 14 Nov would last 14 days, less than half a month, so it runs to 14 Dec.
	expect(open).toMatchObject({ startDate: "2026-11-01", endDate: "2026-12-14" });
	const profile = await ana.query(api.profiles.myProfile, {});
	expect(profile?.plan).toEqual(MONTHLY_15);
	expect(profile?.nextPlan).toBeNull();

	const following = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return ensureOpenCycle(ctx, space, "2026-12-20", space.ownerId);
	});
	expect(following).toMatchObject({ startDate: "2026-12-15", endDate: "2027-01-14" });
});

test("closing the household cycle does not apply my personal pending change", async () => {
	const t = harness();
	const ana = await startAna(t);
	await ana.mutation(api.profiles.startTrial, {});
	await ana.mutation(api.household.createHousehold, { name: "Casa" });
	await ana.mutation(api.settings.updatePlan, MONTHLY_15);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	const open = await ana.mutation(api.cycles.ensureOpen, { space: "household" });

	expect(open).toMatchObject({ startDate: "2026-11-01", endDate: "2026-11-30" });
	const profile = await ana.query(api.profiles.myProfile, {});
	expect(profile?.plan).toEqual(ANA_PLAN);
	expect(profile?.nextPlan).toEqual(MONTHLY_15);
});

test("a pending change belongs to its owner", async () => {
	const t = harness();
	const ana = await startAna(t);
	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Luis" });

	await ana.mutation(api.settings.updatePlan, WEEKLY_MONDAY);

	expect((await ana.query(api.profiles.myProfile, {}))?.nextPlan).toEqual(WEEKLY_MONDAY);
	expect((await luis.query(api.profiles.myProfile, {}))?.nextPlan).toBeNull();
});
