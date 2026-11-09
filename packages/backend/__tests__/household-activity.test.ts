import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { activityText, EVENT_TYPES, type EventType } from "../shared/activity";
import { couple, DAY, joinedCouple, START, startUser, TODAY } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const household = "household" as const;
const tick = () => vi.advanceTimersByTime(1_000);

async function allEvents(pair: Awaited<ReturnType<typeof joinedCouple>>) {
	const events = [];
	let before: number | undefined;
	do {
		const page = await pair.ana.as.query(api.activity.list, { before });
		events.push(...page.events);
		before = page.next ?? undefined;
	} while (before !== undefined);
	return events;
}

test("every shared change and every withdrawal leaves its event, with who did it", async () => {
	const pair = await joinedCouple();
	const { ana, luis } = pair;
	const expected: EventType[] = [];
	const step = async (type: EventType | null, action: () => Promise<unknown>) => {
		tick();
		await action();
		if (type) expected.push(type);
	};

	await step(null, () =>
		ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 }),
	);
	await step("fund_goal_changed", () =>
		luis.as.mutation(api.goals.setFundGoal, { space: household, targetCents: 420_000 }),
	);
	await step("split_changed", () =>
		ana.as.mutation(api.settings.updateSplit, {
			space: household,
			split: { needs: 40, wants: 40, savings: 20 },
		}),
	);
	await step("cycle_changed", () =>
		luis.as.mutation(api.household.updateCycle, { cadence: "biweekly", cycleStartDay: 3 }),
	);
	await step("renamed", () => ana.as.mutation(api.household.rename, { name: "Casa" }));

	await step("goal_added", () =>
		ana.as.mutation(api.goals.add, { space: household, name: "Viaje", targetCents: 100_000 }),
	);
	const [goal] = await ana.as.query(api.goals.list, { space: household });
	if (!goal) throw new Error("missing goal");
	await step("goal_edited", () =>
		luis.as.mutation(api.goals.update, {
			space: household,
			id: goal.id,
			name: "Viaje",
			targetCents: 200_000,
		}),
	);
	await step("saving_added", () =>
		luis.as.mutation(api.transactions.addSaving, {
			space: household,
			amountCents: 3_000,
			goalId: goal.id,
		}),
	);
	await step("goal_removed", () =>
		ana.as.mutation(api.goals.remove, { space: household, id: goal.id }),
	);

	const schedule = { frequency: "monthly" as const, dueDay: 25 };
	await step("commitment_added", () =>
		ana.as.mutation(api.commitments.add, {
			space: household,
			name: "Internet",
			amountCents: 9_000,
			envelope: "needs",
			schedule,
		}),
	);
	const { items } = await ana.as.query(api.commitments.list, { space: household, today: TODAY });
	const commitment = items[0];
	if (!commitment) throw new Error("missing commitment");
	await step("commitment_edited", () =>
		luis.as.mutation(api.commitments.update, {
			space: household,
			id: commitment.id,
			name: "Internet",
			amountCents: 9_500,
			envelope: "needs",
			schedule,
		}),
	);
	await step("commitment_paid", () =>
		luis.as.mutation(api.commitments.markPaid, { space: household, id: commitment.id }),
	);
	await step("commitment_removed", () =>
		ana.as.mutation(api.commitments.remove, { space: household, id: commitment.id }),
	);

	await step(null, () =>
		ana.as.mutation(api.transactions.addExpense, {
			space: household,
			amountCents: 4_500,
			envelope: "needs",
			note: "Mercado",
		}),
	);
	await step(null, () =>
		ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 10_000 }),
	);
	const { rows } = await ana.as.query(api.transactions.list, { space: household, today: TODAY });
	const expense = rows.find((row) => row.note === "Mercado");
	const income = rows.find((row) => row.kind === "income" && row.amountCents === 10_000);
	if (!expense || !income) throw new Error("missing rows");
	await step("expense_edited", () =>
		ana.as.mutation(api.transactions.updateExpense, {
			space: household,
			id: expense.id,
			amountCents: 5_000,
			envelope: "needs",
			note: "Mercado",
		}),
	);
	await step("expense_deleted", () =>
		ana.as.mutation(api.transactions.deleteExpense, { space: household, id: expense.id }),
	);
	await step("income_edited", () =>
		ana.as.mutation(api.transactions.updateIncome, {
			space: household,
			id: income.id,
			amountCents: 12_000,
		}),
	);
	await step("income_deleted", () =>
		ana.as.mutation(api.transactions.deleteIncome, { space: household, id: income.id }),
	);

	await step("saving_added", () =>
		ana.as.mutation(api.transactions.addSaving, { space: household, amountCents: 8_000 }),
	);
	await step("withdrawal", () =>
		luis.as.mutation(api.transactions.withdrawSaving, {
			space: household,
			amountCents: 2_000,
			reason: "emergency",
		}),
	);

	const events = (await allEvents(pair)).reverse();
	expect(events.map((event) => event.type)).toEqual(expected);
	// Every kind of event the household can have is covered by the steps above.
	expect(new Set(events.map((event) => event.type))).toEqual(new Set(EVENT_TYPES));

	const byType = (type: EventType) => events.find((event) => event.type === type);
	expect(byType("fund_goal_changed")).toMatchObject({
		who: "Renzo",
		before: "Sin meta",
		after: "S/ 4,200.00",
	});
	expect(byType("split_changed")).toMatchObject({
		who: "Camila",
		before: "50 · 30 · 20",
		after: "40 · 40 · 20",
	});
	expect(byType("renamed")).toMatchObject({ before: "Nuestro espacio", after: "Casa" });
	expect(byType("withdrawal")).toMatchObject({ who: "Renzo", amountCents: 2_000 });
	expect(byType("expense_deleted")?.detail).toBe("Mercado · S/ 50.00");
	expect(byType("expense_edited")).toMatchObject({ before: "S/ 45.00", after: "S/ 50.00" });
	expect(byType("commitment_paid")?.detail).toBe("Internet · S/ 95.00");
	expect(byType("goal_edited")).toMatchObject({ detail: "Viaje", before: "S/ 1,000.00" });
});

test("nothing recorded in Personal reaches the household activity", async () => {
	const pair = await joinedCouple();
	const { ana } = pair;
	await ana.as.mutation(api.transactions.addExpense, {
		space: "personal",
		amountCents: 1_000,
		envelope: "needs",
	});
	await ana.as.mutation(api.goals.add, { space: "personal", name: "Mía", targetCents: 5_000 });
	await ana.as.mutation(api.settings.updateSplit, {
		space: "personal",
		split: { needs: 40, wants: 40, savings: 20 },
	});
	await ana.as.mutation(api.goals.setFundGoal, { space: "personal", targetCents: 9_000 });
	expect(await allEvents(pair)).toEqual([]);
});

test("a new expense is not in the activity: it is already in Movimientos", async () => {
	const pair = await joinedCouple();
	await pair.ana.as.mutation(api.transactions.addExpense, {
		space: household,
		amountCents: 1_000,
		envelope: "needs",
	});
	expect(await allEvents(pair)).toEqual([]);
});

test("the activity comes in pages of 20, newest first, with no repeats", async () => {
	const pair = await joinedCouple();
	for (let i = 0; i < 25; i++) {
		tick();
		await pair.ana.as.mutation(api.household.rename, { name: `Casa ${i}` });
	}
	const first = await pair.luis.as.query(api.activity.list, {});
	expect(first.events).toHaveLength(20);
	expect(first.events[0]).toMatchObject({ after: "Casa 24", mine: false, who: "Camila" });
	expect(first.next).not.toBeNull();
	const second = await pair.luis.as.query(api.activity.list, { before: first.next ?? 0 });
	expect(second.events).toHaveLength(5);
	expect(second.next).toBeNull();
	const ids = [...first.events, ...second.events].map((event) => event.id);
	expect(new Set(ids).size).toBe(25);
	expect(second.events.at(-1)?.after).toBe("Casa 0");
});

test("only members read the activity", async () => {
	const { luis } = await couple();
	await expect(luis.as.query(api.activity.list, {})).rejects.toThrow("Aún no tienes un hogar.");
});

test("a withdrawal shows in the other's Inicio until they dismiss it; the one who withdrew never sees it", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await ana.as.mutation(api.transactions.addSaving, { space: household, amountCents: 10_000 });
	expect((await ana.as.query(api.household.get, {}))?.withdrawalNotice).toBeNull();

	tick();
	await luis.as.mutation(api.transactions.withdrawSaving, {
		space: household,
		amountCents: 2_500,
		reason: "emergency",
	});
	expect((await ana.as.query(api.household.get, {}))?.withdrawalNotice).toEqual({
		name: "Renzo",
		amountCents: 2_500,
	});
	expect((await luis.as.query(api.household.get, {}))?.withdrawalNotice).toBeNull();

	await ana.as.mutation(api.household.dismissWithdrawalNotice, {});
	expect((await ana.as.query(api.household.get, {}))?.withdrawalNotice).toBeNull();

	tick();
	await luis.as.mutation(api.transactions.withdrawSaving, {
		space: household,
		amountCents: 1_000,
		reason: "other",
	});
	expect((await ana.as.query(api.household.get, {}))?.withdrawalNotice?.amountCents).toBe(1_000);
	tick();
	await ana.as.mutation(api.transactions.withdrawSaving, {
		space: household,
		amountCents: 500,
		reason: "other",
	});
	expect((await luis.as.query(api.household.get, {}))?.withdrawalNotice?.amountCents).toBe(500);
	expect((await ana.as.query(api.household.get, {}))?.withdrawalNotice?.amountCents).toBe(1_000);
});

test("who joins later does not see withdrawals from before", async () => {
	const { t, ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await ana.as.mutation(api.transactions.addSaving, { space: household, amountCents: 10_000 });
	tick();
	await ana.as.mutation(api.transactions.withdrawSaving, {
		space: household,
		amountCents: 2_500,
		reason: "emergency",
	});
	await luis.as.mutation(api.household.leaveHousehold, {});

	const marta = await startUser(t, "marta@correo.com", "Marta Soto");
	// startUser resets the clock; the join happens after the withdrawal.
	vi.setSystemTime(new Date(Date.parse(START) + DAY));
	const { code } = await ana.as.mutation(api.household.createInvite, {});
	await marta.as.mutation(api.household.joinHousehold, { code });
	expect((await marta.as.query(api.household.get, {}))?.withdrawalNotice).toBeNull();
	expect((await ana.as.query(api.household.get, {}))?.withdrawalNotice).toBeNull();
});

test("deleting an empty household takes its activity with it", async () => {
	const { t, ana, luis, code } = await couple();
	await luis.as.mutation(api.household.createHousehold, {});
	await luis.as.mutation(api.household.rename, { name: "Mío" });
	await luis.as.mutation(api.household.joinHousehold, { code, replaceEmpty: true });
	const left = await t.run(async (ctx) => await ctx.db.query("spaceEvents").take(10));
	expect(left).toEqual([]);
	expect((await ana.as.query(api.household.get, {}))?.partnerName).toBe("Renzo");
});

test("activityText says 'Tú' for what you did and the first name for the other", () => {
	expect(activityText("split_changed", false, "Ana")).toBe("Ana cambió el reparto");
	expect(activityText("fund_goal_changed", true, "Ana")).toBe("Tú editaste la meta del fondo");
	expect(activityText("expense_deleted", false, "Ana")).toBe("Ana borró un gasto");
	expect(activityText("withdrawal", false, "Ana")).toBe("Ana retiró del fondo");
	expect(activityText("commitment_paid", true, "Ana")).toBe("Tú marcaste pagado");
	for (const type of EVENT_TYPES) {
		expect(activityText(type, true, "Ana")).toMatch(/^Tú \S+/);
		expect(activityText(type, false, "Ana")).toMatch(/^Ana \S+/);
	}
});
