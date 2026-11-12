import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import { type Harness, harness, signIn } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: { needs: 50, wants: 30, savings: 20 },
};

type Ana = Awaited<ReturnType<typeof signIn>>;

// Sign in under the fake clock: convex-test never lets _creationTime go back. Better Auth sessions
// last 7 days; stretch it to reach December.
async function startAna(t: Harness, now: string, plan = onboard) {
	vi.useFakeTimers({ now: new Date(now) });
	const ana = await signIn(t, "ana@correo.com", "Ana");
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: "ana@correo.com" }],
	});
	await t.mutation(components.betterAuth.adapter.updateOne, {
		input: {
			model: "session",
			where: [{ field: "userId", value: user._id }],
			update: { expiresAt: Date.UTC(2027, 0, 1) },
		},
	});
	await ana.mutation(api.profiles.completeOnboarding, { ...plan, name: "Ana" });
	return ana;
}

async function openCycleOn(ana: Ana, day: string) {
	vi.setSystemTime(new Date(`${day}T17:00:00.000Z`));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	return ana.query(api.cycles.getUnseenClosed, { space: "personal" });
}

function readFundCents(ana: Ana, today: string) {
	return ana.query(api.goals.fund, { space: "personal", today }).then((fund) => fund.fundCents);
}

test("getUnseenClosed returns the closed cycle until markClosedSeen", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");

	expect(await ana.query(api.cycles.getUnseenClosed, { space: "personal" })).toBeNull();

	const unseen = await openCycleOn(ana, "2026-11-01");
	if (!unseen) throw new Error("sin aviso");

	await ana.mutation(api.cycles.markClosedSeen, { cycleId: unseen.cycleId });
	expect(await ana.query(api.cycles.getUnseenClosed, { space: "personal" })).toBeNull();
});

test("dismissing the same notice twice, as a double click or two tabs would, is harmless", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	const unseen = await openCycleOn(ana, "2026-11-01");
	if (!unseen) throw new Error("sin aviso");

	await ana.mutation(api.cycles.markClosedSeen, { cycleId: unseen.cycleId });
	await ana.mutation(api.cycles.markClosedSeen, { cycleId: unseen.cycleId });

	expect(await ana.query(api.cycles.getUnseenClosed, { space: "personal" })).toBeNull();
});

test("the notice carries what the close moved: leftover N+G into the new cycle, Ahorro into the fund", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");

	const unseen = await openCycleOn(ana, "2026-11-01");

	expect(unseen).toEqual({
		cycleId: expect.any(String),
		newCycleStart: "2026-11-01",
		carriedCents: 40_000,
		fundedCents: 10_000,
		surplusCents: 0,
		shortfallCents: 0,
	});
	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	expect(home.needsCents + home.wantsCents).toBe(40_000);
	expect(await readFundCents(ana, "2026-11-01")).toBe(10_000);
});

test("overspending makes the carried amount negative", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	await ana.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 45_000,
		envelope: "needs",
	});

	const unseen = await openCycleOn(ana, "2026-11-01");

	expect(unseen).toMatchObject({ carriedCents: -5_000, fundedCents: 10_000 });
});

test("a cycle with no money still closes with a notice of zeros", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z", { ...onboard, todayCents: 0 });

	const unseen = await openCycleOn(ana, "2026-11-01");

	expect(unseen).toMatchObject({ carriedCents: 0, fundedCents: 0 });
});

test("an early salary is not leftover: it lands in the new cycle but not in the carried amount", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	vi.setSystemTime(new Date("2026-10-30T17:00:00.000Z"));
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 100_000,
		forNextCycle: true,
	});

	const unseen = await openCycleOn(ana, "2026-11-01");

	expect(unseen).toMatchObject({ carriedCents: 40_000, fundedCents: 10_000 });
	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	expect(home.needsCents + home.wantsCents).toBe(120_000);
});

test("Ahorro already contributed does not count as moved by the close", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	vi.setSystemTime(new Date("2026-10-25T17:00:00.000Z"));
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 3_000 });

	const unseen = await openCycleOn(ana, "2026-11-01");

	expect(unseen).toMatchObject({ carriedCents: 40_000, fundedCents: 7_000 });
	expect(await readFundCents(ana, "2026-11-01")).toBe(10_000);
});

test("money withdrawn from the fund comes back as leftover in Necesidades, not as Ahorro", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	vi.setSystemTime(new Date("2026-10-25T17:00:00.000Z"));
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 3_000 });
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 2_000,
		reason: "emergency",
	});

	const unseen = await openCycleOn(ana, "2026-11-01");

	expect(unseen).toMatchObject({ carriedCents: 42_000, fundedCents: 7_000 });
	expect(await readFundCents(ana, "2026-11-01")).toBe(8_000);
});

test("dismissing an older closure does not hide a newer one", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	const november = await openCycleOn(ana, "2026-11-01");
	if (!november) throw new Error("sin aviso de octubre");

	const december = await openCycleOn(ana, "2026-12-01");
	expect(december?.newCycleStart).toBe("2026-12-01");
	await ana.mutation(api.cycles.markClosedSeen, { cycleId: november.cycleId });

	expect(await ana.query(api.cycles.getUnseenClosed, { space: "personal" })).toEqual(december);
});

test("a late answer for an older closure does not bring back a dismissed notice", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	const first = await openCycleOn(ana, "2026-11-01");
	const second = await openCycleOn(ana, "2026-12-01");
	if (!first || !second) throw new Error("sin aviso");

	await ana.mutation(api.cycles.markClosedSeen, { cycleId: second.cycleId });
	await ana.mutation(api.cycles.markClosedSeen, { cycleId: first.cycleId });

	expect(await ana.query(api.cycles.getUnseenClosed, { space: "personal" })).toBeNull();
});

test("without a session nobody can read or dismiss the notice", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	const unseen = await openCycleOn(ana, "2026-11-01");
	if (!unseen) throw new Error("sin aviso");

	await expect(t.query(api.cycles.getUnseenClosed, { space: "personal" })).rejects.toThrow();
	await expect(
		t.mutation(api.cycles.markClosedSeen, { cycleId: unseen.cycleId }),
	).rejects.toThrow();
	expect(await ana.query(api.cycles.getUnseenClosed, { space: "personal" })).toEqual(unseen);
});

test("someone else cannot dismiss Ana's notice", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	const unseen = await openCycleOn(ana, "2026-11-01");
	if (!unseen) throw new Error("sin aviso");
	const luis = await signIn(t, "luis@correo.com", "Luis");

	await expect(
		luis.mutation(api.cycles.markClosedSeen, { cycleId: unseen.cycleId }),
	).rejects.toThrow("No encontramos este dato.");
	expect(await ana.query(api.cycles.getUnseenClosed, { space: "personal" })).toEqual(unseen);
});

test("a closed cycle with no cycle after it is an error, not a notice that silently never shows", async () => {
	const t = harness();
	const ana = await startAna(t, "2026-10-20T17:00:00.000Z");
	await t.run(async (ctx) => {
		const space = await ctx.db.query("spaces").first();
		if (!space) throw new Error("sin espacio");
		await ctx.db.insert("cycles", {
			spaceId: space._id,
			startDate: "2026-09-01",
			endDate: "2026-09-30",
			closedAt: Date.now(),
			split: onboard.split,
			envelopes: { needsCents: 0, wantsCents: 0, savingsCents: 0 },
			carryIn: { needsCents: 0, wantsCents: 0 },
		});
	});

	await expect(ana.query(api.cycles.getUnseenClosed, { space: "personal" })).rejects.toThrow(
		"No encontramos tu ciclo.",
	);
});
