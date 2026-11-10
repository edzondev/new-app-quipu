import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { couple, DAY, joinedCouple, setTrialEnd, signUp, START } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const READ_ONLY = "Solo lectura. Activa Plus para seguir anotando.";
const LATER = "2026-11-04";
const household = "household" as const;
const monthly20 = { frequency: "monthly" as const, rule: { kind: "day" as const, day: 20 } };

/** Rows written while the household still had Plus, then both trials expire. */
async function lapsedHousehold() {
	const pair = await joinedCouple();
	const { ana } = pair;
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await ana.as.mutation(api.transactions.addExpense, {
		space: household,
		amountCents: 1_000,
		envelope: "needs",
	});
	await ana.as.mutation(api.transactions.addSaving, { space: household, amountCents: 5_000 });
	await ana.as.mutation(api.commitments.add, {
		space: household,
		name: "Internet",
		amountCents: 9_000,
		envelope: "needs",
		schedule: monthly20,
	});
	await ana.as.mutation(api.goals.add, { space: household, name: "Viaje", targetCents: 100_000 });
	const today = "2026-10-20";
	const rows = await ana.as.query(api.transactions.list, { space: household, today });
	const expenseId = rows.rows.find((row) => row.kind === "expense")?.id;
	const incomeId = rows.rows.find((row) => row.kind === "income")?.id;
	const {
		items: [commitment],
	} = await ana.as.query(api.commitments.list, { space: household, today });
	const [goal] = await ana.as.query(api.goals.list, { space: household });
	if (!expenseId || !incomeId || !commitment || !goal) throw new Error("setup incomplete");

	vi.setSystemTime(new Date(Date.parse(START) + 15 * DAY));
	return { ...pair, expenseId, incomeId, commitmentId: commitment.id, goalId: goal.id };
}

test("with the Plus lapsed, every write to the household is refused", async () => {
	const s = await lapsedHousehold();
	const writes: [string, () => Promise<unknown>][] = [
		[
			"addExpense",
			() =>
				s.ana.as.mutation(api.transactions.addExpense, {
					space: household,
					amountCents: 100,
					envelope: "needs",
				}),
		],
		[
			"updateExpense",
			() =>
				s.ana.as.mutation(api.transactions.updateExpense, {
					space: household,
					id: s.expenseId,
					amountCents: 200,
					envelope: "needs",
				}),
		],
		[
			"deleteExpense",
			() =>
				s.ana.as.mutation(api.transactions.deleteExpense, { space: household, id: s.expenseId }),
		],
		[
			"addIncome",
			() => s.luis.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100 }),
		],
		[
			"updateIncome",
			() =>
				s.ana.as.mutation(api.transactions.updateIncome, {
					space: household,
					id: s.incomeId,
					amountCents: 200_000,
				}),
		],
		[
			"deleteIncome",
			() => s.ana.as.mutation(api.transactions.deleteIncome, { space: household, id: s.incomeId }),
		],
		[
			"addSaving",
			() => s.ana.as.mutation(api.transactions.addSaving, { space: household, amountCents: 100 }),
		],
		[
			"withdrawSaving",
			() =>
				s.luis.as.mutation(api.transactions.withdrawSaving, {
					space: household,
					amountCents: 100,
					reason: "emergency",
				}),
		],
		[
			"commitments.add",
			() =>
				s.ana.as.mutation(api.commitments.add, {
					space: household,
					name: "Luz",
					amountCents: 5_000,
					envelope: "needs",
					schedule: monthly20,
				}),
		],
		[
			"commitments.update",
			() =>
				s.luis.as.mutation(api.commitments.update, {
					space: household,
					id: s.commitmentId,
					name: "Internet",
					amountCents: 9_500,
					envelope: "needs",
					schedule: monthly20,
				}),
		],
		[
			"commitments.remove",
			() => s.ana.as.mutation(api.commitments.remove, { space: household, id: s.commitmentId }),
		],
		[
			"commitments.markPaid",
			() => s.luis.as.mutation(api.commitments.markPaid, { space: household, id: s.commitmentId }),
		],
		[
			"goals.add",
			() =>
				s.ana.as.mutation(api.goals.add, { space: household, name: "Casa", targetCents: 5_000 }),
		],
		[
			"goals.update",
			() =>
				s.luis.as.mutation(api.goals.update, {
					space: household,
					id: s.goalId,
					name: "Viaje",
					targetCents: 200_000,
				}),
		],
		["goals.remove", () => s.ana.as.mutation(api.goals.remove, { space: household, id: s.goalId })],
		[
			"goals.setFundGoal",
			() => s.luis.as.mutation(api.goals.setFundGoal, { space: household, targetCents: 1_000 }),
		],
		[
			"settings.updateSplit",
			() =>
				s.ana.as.mutation(api.settings.updateSplit, {
					space: household,
					split: { needs: 40, wants: 40, savings: 20 },
				}),
		],
		["household.rename", () => s.luis.as.mutation(api.household.rename, { name: "Casa" })],
		[
			"household.updateCycle",
			() => s.ana.as.mutation(api.household.updateCycle, { cadence: "weekly", cycleStartDay: 1 }),
		],
	];

	for (const [name, write] of writes) {
		await expect(write(), name).rejects.toThrow(READ_ONLY);
	}
});

test("with the Plus lapsed, the household is still read and closes its cycle", async () => {
	const s = await lapsedHousehold();
	const today = LATER;
	const home = await s.luis.as.query(api.balances.getHome, { space: household, today });
	expect(home.needsCents).toBeGreaterThan(0);
	const list = await s.luis.as.query(api.transactions.list, { space: household, today });
	expect(list.rows).toHaveLength(3);
	expect((await s.ana.as.query(api.goals.fund, { space: household, today })).fundCents).toBe(5_000);
	expect((await s.ana.as.query(api.household.get, {}))?.plus.active).toBe(false);

	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	const next = await s.ana.as.mutation(api.cycles.ensureOpen, { space: household });
	expect(next.startDate).toBe("2026-11-15");
});

test("the Personal space still writes with the Plus lapsed", async () => {
	const s = await lapsedHousehold();
	await s.ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 100,
		envelope: "needs",
	});
	await s.ana.as.mutation(api.goals.add, { space: "personal", name: "Uno", targetCents: 1_000 });
});

test("the household writes while either of the two has Plus", async () => {
	const s = await lapsedHousehold();
	await setTrialEnd(s.t, s.luis.userId, Date.now() + 30 * DAY);

	await s.ana.as.mutation(api.transactions.addExpense, {
		space: household,
		amountCents: 100,
		envelope: "needs",
	});
	expect((await s.ana.as.query(api.household.get, {}))?.plus.active).toBe(true);

	await setTrialEnd(s.t, s.luis.userId, Date.now() - DAY);
	await expect(
		s.ana.as.mutation(api.transactions.addExpense, {
			space: household,
			amountCents: 100,
			envelope: "needs",
		}),
	).rejects.toThrow(READ_ONLY);
});

test("the server decides at the moment of writing, with no reload", async () => {
	const { ana } = await joinedCouple();
	const args = { space: household, amountCents: 100, envelope: "needs" as const };
	await ana.as.mutation(api.transactions.addExpense, args);

	vi.setSystemTime(new Date(Date.parse(START) + 14 * DAY - 1_000));
	await ana.as.mutation(api.transactions.addExpense, args);
	vi.setSystemTime(new Date(Date.parse(START) + 14 * DAY + 1_000));
	await expect(ana.as.mutation(api.transactions.addExpense, args)).rejects.toThrow(READ_ONLY);
});

test("household.get names who pays, the same for both, and tells each if it is them", async () => {
	const { ana, luis } = await joinedCouple();
	expect((await ana.as.query(api.household.get, {}))?.plus).toEqual({
		active: true,
		payerName: "Camila",
		payerIsMe: true,
	});
	expect((await luis.as.query(api.household.get, {}))?.plus).toEqual({
		active: true,
		payerName: "Camila",
		payerIsMe: false,
	});
});

test("if both have a trial on record, the owner pays; the one with a trial pays if the owner has none", async () => {
	const { t, ana, luis } = await joinedCouple();
	expect((await luis.as.query(api.household.get, {}))?.plus.payerName).toBe("Camila");
	await t.run(async (ctx) => {
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", ana.userId))
			.unique();
		if (!profile) throw new Error("missing profile");
		await ctx.db.patch("profiles", profile._id, { trialEndsAt: undefined });
	});
	expect((await ana.as.query(api.household.get, {}))?.plus).toMatchObject({
		payerName: "Renzo",
		payerIsMe: false,
	});
});

test("after the payer leaves, the new owner sees no false notice: nobody pays", async () => {
	const { t, ana, code } = await couple();
	vi.setSystemTime(new Date("2026-10-20T18:00:00.000Z"));
	const marta = await signUp(t, "marta@correo.com", "Marta Soto");
	await marta.as.mutation(api.household.joinHousehold, { code });
	await ana.as.mutation(api.household.leaveHousehold, {});

	const info = await marta.as.query(api.household.get, {});
	expect(info?.isOwner).toBe(true);
	expect(info?.plus).toEqual({ active: false, payerName: null, payerIsMe: false });
});

test("after the payer leaves, a partner whose own trial lapsed is the one named", async () => {
	const { ana, luis } = await joinedCouple();
	vi.setSystemTime(new Date(Date.parse(START) + 15 * DAY));
	await ana.as.mutation(api.household.leaveHousehold, {});
	expect((await luis.as.query(api.household.get, {}))?.plus).toEqual({
		active: false,
		payerName: "Renzo",
		payerIsMe: true,
	});
});

test("the third goal of a household works with the Plus of the partner only", async () => {
	const { t, ana, luis } = await joinedCouple();
	// Camila's trial is over; Renzo's is not. Her own Plus is not what counts in the household.
	await setTrialEnd(t, ana.userId, Date.now() - DAY);
	await setTrialEnd(t, luis.userId, Date.now() + 30 * DAY);
	for (const name of ["Uno", "Dos", "Tres"]) {
		await ana.as.mutation(api.goals.add, { space: household, name, targetCents: 10_000 });
	}
	expect(await ana.as.query(api.goals.list, { space: household })).toHaveLength(3);
});

test("Personal still asks for Plus on the third goal", async () => {
	const { t, ana } = await joinedCouple();
	await setTrialEnd(t, ana.userId, Date.now() - DAY);
	await ana.as.mutation(api.goals.add, { space: "personal", name: "Uno", targetCents: 10_000 });
	await ana.as.mutation(api.goals.add, { space: "personal", name: "Dos", targetCents: 10_000 });
	await expect(
		ana.as.mutation(api.goals.add, { space: "personal", name: "Tres", targetCents: 10_000 }),
	).rejects.toThrow("Esto requiere Quipu Plus.");
});
