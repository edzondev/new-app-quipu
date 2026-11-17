import { expect, test } from "vitest";
import { check, isClean } from "../scripts/migrate-old/check";
import {
	convert,
	fits,
	MAX_MOVEMENTS,
	type OldExport,
	type SkipReason,
} from "../scripts/migrate-old/convert";
import { counts } from "../scripts/migrate-old/counts";

/** Noon in Lima of that day, as the old app stores a moment. */
const at = (date: string) => Date.parse(`${date}T12:00:00-05:00`);

const NO_EXTRA_TABLES = {
	financialSpaces: null,
	spaceMembers: null,
	commitmentReservations: null,
	internalTransfers: null,
	polarCustomers: null,
	polarSubscriptions: null,
};

function envelopes(
	cycleId: string,
	left: [number, number, number],
	carry: [number, number, number] = [0, 0, 0],
): OldExport["envelopes"] {
	return (["needs", "wants", "savings"] as const).map((type, i) => ({
		_id: `${cycleId}-${type}`,
		cycleId,
		type,
		remainingAmount: left[i],
		carriedOverCents: carry[i],
	}));
}

/**
 * Ana, invented: paid monthly on the 1st, 50/30/20. September closed with S/ 100 and S/ 50 left;
 * October is open with that carry, an income of S/ 500 and a S/ 50 expense.
 */
function ana(): OldExport {
	return {
		users: [{ _id: "u1", email: "Ana@Correo.com", emailVerified: true }],
		profiles: [
			{
				_id: "p1",
				userId: "u1",
				name: "Ana Torres",
				currencyCode: "PEN",
				incomeModel: "fixed",
				payFrequency: "monthly",
				paydays: [1],
				allocationNeeds: 50,
				allocationWants: 30,
				allocationSavings: 20,
				plan: "free",
			},
		],
		financialCycles: [
			{ _id: "c1", profileId: "p1", startDate: at("2026-09-01"), status: "closed" },
			{ _id: "c2", profileId: "p1", startDate: at("2026-10-01"), status: "active" },
		],
		envelopes: [
			...envelopes("c1", [10_000, 5_000, 20_000]),
			...envelopes("c2", [30_000, 20_000, 30_000], [10_000, 5_000, 20_000]),
		],
		subEnvelopes: [
			{
				profileId: "p1",
				label: "Fondo de Emergencia",
				currentAmount: 30_000,
				isSystemDefault: true,
			},
		],
		fixedCommitments: [
			{ profileId: "p1", name: "Alquiler", amount: 20_000, envelope: "needs", dueDay: 25 },
		],
		expenses: [
			{
				cycleId: "c1",
				envelopeId: "c1-needs",
				amount: 40_000,
				description: "Mercado",
				timestamp: at("2026-09-10"),
			},
			{
				cycleId: "c1",
				envelopeId: "c1-wants",
				amount: 25_000,
				description: " ",
				timestamp: at("2026-09-12"),
			},
			{
				cycleId: "c2",
				envelopeId: "c2-needs",
				amount: 5_000,
				description: "Pasajes",
				timestamp: at("2026-10-05"),
			},
		],
		incomeEvents: [
			{
				cycleId: "c1",
				amount: 100_000,
				description: "Sueldo",
				occurredAt: at("2026-09-01"),
				distributionApplied: { needs: 50_000, wants: 30_000, savings: 20_000 },
				incomeKind: "habitual",
			},
			{
				cycleId: "c2",
				amount: 50_000,
				description: "Sueldo",
				occurredAt: at("2026-10-01"),
				distributionApplied: { needs: 25_000, wants: 15_000, savings: 10_000 },
				incomeKind: "habitual",
			},
		],
	};
}

function only(old: OldExport) {
	const { rows } = convert(old);
	expect(rows).toHaveLength(1);
	return rows[0];
}

test("a simple person arrives with their plan, cycles, movements, fund and commitment", () => {
	expect(only(ana())).toEqual({
		email: "ana@correo.com",
		status: "pending",
		name: "Ana Torres",
		plan: { cadence: "monthly", cycleStartDay: 1, incomeCents: 50_000 },
		split: { needs: 50, wants: 30, savings: 20 },
		fundCents: 30_000,
		closed: [
			{
				startDate: "2026-09-01",
				endDate: "2026-09-30",
				closedAt: at("2026-10-01"),
				envelopes: { needsCents: 10_000, wantsCents: 5_000, savingsCents: 20_000 },
				carryIn: { needsCents: 0, wantsCents: 0 },
				rows: [
					{
						kind: "income",
						amountCents: 100_000,
						date: "2026-09-01",
						allocation: { needsCents: 50_000, wantsCents: 30_000, savingsCents: 20_000 },
						note: "Sueldo",
					},
					{
						kind: "expense",
						amountCents: 40_000,
						date: "2026-09-10",
						envelope: "needs",
						note: "Mercado",
					},
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
					note: "Sueldo",
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
		goals: [],
		commitments: [{ name: "Alquiler", amountCents: 20_000, envelope: "needs", day: 25 }],
	});
});

test("three goals all come, and one without a target takes what it has saved", () => {
	const old = ana();
	old.subEnvelopes.push(
		{
			profileId: "p1",
			label: "Viaje a Cusco",
			currentAmount: 20_000,
			targetAmount: 100_000,
			isSystemDefault: false,
		},
		{
			profileId: "p1",
			label: "Laptop",
			currentAmount: 0,
			targetAmount: 300_000,
			isSystemDefault: false,
		},
		{ profileId: "p1", label: "Curso", currentAmount: 50_000, isSystemDefault: false },
		{ profileId: "p1", label: "Sin nada", currentAmount: 0, isSystemDefault: false },
	);
	const result = convert(old);
	expect(result.rows[0].goals).toEqual([
		{ name: "Viaje a Cusco", targetCents: 100_000, savedCents: 20_000 },
		{ name: "Laptop", targetCents: 300_000, savedCents: 0 },
		{ name: "Curso", targetCents: 50_000, savedCents: 50_000 },
	]);
	expect(result.dropped.emptyGoals).toBe(1);
});

test("variable income of 15 days becomes a biweekly cycle that starts on the active cycle's day", () => {
	const old = ana();
	Object.assign(old.profiles[0], {
		incomeModel: "variable",
		payFrequency: undefined,
		paydays: undefined,
		cycleDurationDays: 15,
	});
	old.financialCycles[1].startDate = at("2026-10-07");
	expect(only(old).plan).toEqual({ cadence: "biweekly", cycleStartDay: 7 });
});

test("the opening cycle's starting balance arrives as an income, not as carry", () => {
	const old = ana();
	old.financialCycles[0].isOpeningCycle = true;
	old.envelopes.splice(0, 3, ...envelopes("c1", [10_000, 5_000, 20_000], [25_000, 15_000, 10_000]));
	const first = only(old).closed[0];
	expect(first.carryIn).toEqual({ needsCents: 0, wantsCents: 0 });
	expect(first.rows[0]).toEqual({
		kind: "income",
		amountCents: 50_000,
		date: "2026-09-01",
		allocation: { needsCents: 25_000, wantsCents: 15_000, savingsCents: 10_000 },
		note: "Saldo inicial",
	});
});

test("a gratification sent whole to savings is an extra with toSavings; a CTS is another extra", () => {
	const old = ana();
	const extra = {
		cycleId: "c2",
		amount: 80_000,
		description: "Gratificación de julio",
		distributionApplied: { needs: 0, wants: 0, savings: 80_000 },
		incomeKind: "extraordinary" as const,
	};
	old.incomeEvents.push(
		{
			...extra,
			occurredAt: at("2026-10-10"),
			extraordinaryType: "gratification_july",
			distributionPolicy: "all_to_savings",
		},
		{ ...extra, occurredAt: at("2026-10-11"), extraordinaryType: "cts", description: "CTS" },
	);
	const rows = only(old).open?.rows.slice(-2);
	expect(rows).toMatchObject([
		{ kind: "income", extraType: "gratification", toSavings: true, note: "Gratificación de julio" },
		{ kind: "income", extraType: "other", note: "CTS" },
	]);
	expect(rows?.[1]).not.toHaveProperty("toSavings", true);
});

test("a note longer than 40 characters is cut to 40", () => {
	const old = ana();
	old.expenses[2].description = "x".repeat(60);
	expect(only(old).open?.rows[1].note).toBe("x".repeat(40));
});

test("a person with a profile and no cycle gets a row with only the gift", () => {
	const old = { ...ana(), financialCycles: [], envelopes: [], expenses: [], incomeEvents: [] };
	const row = only(old);
	expect(row.plan).toBeUndefined();
	expect(row.open).toBeUndefined();
	expect(row.closed).toEqual([]);
});

const SKIPS: [string, (old: OldExport) => void, SkipReason][] = [
	[
		"an unverified email",
		(old: OldExport) => void (old.users[0].emailVerified = false),
		"unverified",
	],
	["no profile", (old: OldExport) => void (old.profiles.length = 0), "noProfile"],
	[
		"a currency other than soles",
		(old: OldExport) => void (old.profiles[0].currencyCode = "USD"),
		"notPen",
	],
	[
		"a suspended account",
		(old: OldExport) => void (old.profiles[0].accountStatus = "suspended"),
		"suspended",
	],
	[
		"two active cycles",
		(old: OldExport) => void (old.financialCycles[0].status = "active"),
		"activeCycles",
	],
	[
		"two cycles that start the same day",
		(old: OldExport) => void (old.financialCycles[0].startDate = at("2026-10-01") - 1000),
		"cycleDates",
	],
];

test.each(SKIPS)("a person with %s gets no row and is counted", (_, change, reason) => {
	const old = ana();
	change(old);
	const result = convert(old);
	expect(result.rows).toEqual([]);
	expect(result.skipped[reason]).toBe(1);
});

test("two accounts with the same email, whatever the case, are both left out", () => {
	const old = ana();
	old.users.push({ _id: "u2", email: "ana@correo.com", emailVerified: true });
	const result = convert(old);
	expect(result.rows).toEqual([]);
	expect(result.skipped.duplicateEmail).toBe(2);
});

test("an expense against savings leaves the history and the balances stay as stored", () => {
	const old = ana();
	old.expenses.push({
		cycleId: "c2",
		envelopeId: "c2-savings",
		subEnvelopeId: "s1",
		amount: 7_000,
		description: "Retiro",
		timestamp: at("2026-10-06"),
	});
	const result = convert(old);
	expect(result.dropped.savingsExpenses).toBe(1);
	expect(result.rows[0].open?.rows).toHaveLength(2);
	expect(result.rows[0].open?.envelopes.savingsCents).toBe(30_000);
});

test("a row with more movements than one claim can write does not fit", () => {
	const old = ana();
	const expense = old.expenses[2];
	old.expenses.push(...Array.from({ length: MAX_MOVEMENTS }, () => ({ ...expense })));
	expect(fits(only(old))).toBe(false);
	expect(fits(only(ana()))).toBe(true);
});

test("the check finds no difference between the old balances and the converted rows", () => {
	const old = ana();
	old.subEnvelopes.push({
		profileId: "p1",
		label: "Viaje",
		currentAmount: 20_000,
		targetAmount: 100_000,
		isSystemDefault: false,
	});
	const result = check(old, convert(old).rows);
	expect(result.checked).toBe(1);
	expect(isClean(result)).toBe(true);
});

test("the check counts each kind of difference, without saying whose", () => {
	const old = ana();
	const rows = convert(old).rows;
	rows[0].fundCents += 1;
	if (rows[0].open) rows[0].open.envelopes.needsCents -= 1;
	rows[0].closed[0].rows.pop();
	const result = check(old, rows);
	expect(result.differences).toEqual({
		missing: 0,
		envelopes: 1,
		fund: 1,
		goals: 0,
		expenses: 1,
		incomes: 0,
	});
	expect(isClean(result)).toBe(false);
});

test("the counts are totals only: no email, name, note or amount of a person", () => {
	const totals = counts(ana(), NO_EXTRA_TABLES, at("2026-10-20"));
	expect(totals).toMatchObject({
		"usuarios.enBetterAuth": 1,
		"usuarios.filasAMigrar": 1,
		"ciclos.total": 2,
		"ciclos.activos": 1,
		"movimientos.gastos": 3,
		"movimientos.ingresos": 2,
		"compromisos.total": 1,
		"ingreso.fijo": 1,
		"hogares.total": null,
		"polar.clientes": null,
	});
	const printed = JSON.stringify(totals);
	for (const personal of ["correo", "Ana", "Torres", "Mercado", "Alquiler", "100000", "30000"]) {
		expect(printed).not.toContain(personal);
	}
	for (const value of Object.values(totals)) {
		expect(value === null || Number.isInteger(value)).toBe(true);
	}
});
