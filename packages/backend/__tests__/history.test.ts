import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { historyCsv } from "../shared/history";
import { DAY, joinedCouple, setTrialEnd } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

test("the household history goes one cycle per page, newest first, with the partner's aporte", async () => {
	const { t, ana, luis } = await joinedCouple();
	await setTrialEnd(t, ana.userId, Date.now() + 365 * DAY);
	await ana.as.mutation(api.transactions.addIncome, { space: "household", amountCents: 100_000 });
	await luis.as.mutation(api.transactions.addContribution, {
		amountCents: 5_000,
		envelope: "needs",
		toEnvelope: "savings",
	});
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "household" });
	await ana.as.mutation(api.transactions.addExpense, {
		space: "household",
		amountCents: 2_000,
		envelope: "wants",
		note: "Cine",
	});

	const first = await ana.as.query(api.history.household, {});
	expect(first.rows).toEqual([
		expect.objectContaining({
			kind: "expense",
			amountCents: 2_000,
			envelope: "wants",
			who: "Camila",
		}),
	]);
	expect(first.next).not.toBeNull();

	const second = await ana.as.query(api.history.household, { before: first.next ?? undefined });
	expect(second.rows.map((row) => [row.kind, row.amountCents, row.who])).toEqual(
		expect.arrayContaining([
			["income", 100_000, "Camila"],
			["contribution", 5_000, "Renzo"],
		]),
	);
	expect(second.rows.find((row) => row.kind === "contribution")?.envelope).toBe("savings");
	expect(second.next).toBeNull();
});

test("the CSV has a BOM, signs expenses and withdrawals, and escapes what someone wrote", () => {
	const csv = historyCsv([
		{
			date: "2026-10-20",
			kind: "expense",
			envelope: "needs",
			note: 'Pan, "rico"',
			amountCents: 1_250,
			who: "Ana",
			auto: false,
		},
		{
			date: "2026-10-21",
			kind: "contribution",
			envelope: "savings",
			note: "=HYPERLINK()",
			amountCents: 5_000,
			who: null,
			auto: false,
		},
		{
			date: "2026-10-22",
			kind: "withdrawal",
			envelope: "savings",
			note: null,
			amountCents: 300,
			who: "Ana",
			auto: false,
		},
	]);
	expect(csv.split("\r\n")).toEqual([
		"﻿Fecha,Tipo,Sobre,Concepto,Monto,Quién",
		'2026-10-20,Gasto,Necesidades,"Pan, ""rico""",-12.50,Ana',
		"2026-10-21,Aporte,Ahorro,'=HYPERLINK(),50.00,Cuenta eliminada",
		"2026-10-22,Retiro,Ahorro,,-3.00,Ana",
	]);
});

test("closing a cycle with Ahorro saves it as automatic, and the CSV says so", async () => {
	const { t, ana } = await joinedCouple();
	await setTrialEnd(t, ana.userId, Date.now() + 365 * DAY);
	await ana.as.mutation(api.transactions.addIncome, { space: "household", amountCents: 100_000 });
	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: "household" });

	const saved = await t.run(async (ctx) =>
		(await ctx.db.query("transactions").take(10)).filter((row) => row.kind === "saving"),
	);
	expect(saved).toEqual([expect.objectContaining({ amountCents: 20_000, auto: true })]);

	const first = await ana.as.query(api.history.household, {});
	const closed = await ana.as.query(api.history.household, { before: first.next ?? undefined });
	expect(historyCsv(closed.rows)).toContain("Ahorro,Ahorro,,200.00,Automático");
});
