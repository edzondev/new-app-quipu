import { describe, expect, it } from "vitest";
import {
	canEdit,
	dayTotalCents,
	filterRows,
	groupByDay,
	movementText,
	type Row,
	rowAction,
	signedAmount,
} from "./movement-rows";

// The functions ask only for the fields they read, so a test row needs no id.
type Fields = Omit<Row, "id">;
const row = (patch: Partial<Fields>): Fields => ({
	kind: "expense",
	amountCents: 1_500,
	date: "2026-11-13",
	note: null,
	envelope: "needs",
	toEnvelope: null,
	goalId: null,
	reason: null,
	extra: false,
	startsOn: null,
	mine: true,
	who: null,
	...patch,
});

const plusOn = { plus: { active: true, payerName: null, payerIsMe: true } };
const plusOff = { plus: { active: false, payerName: null, payerIsMe: false } };
const noHousehold: { space: "personal" | "household"; household: undefined } = {
	space: "personal",
	household: undefined,
};

describe("canEdit", () => {
	it("lets the author edit a gasto, an ingreso and an aporte", () => {
		expect(canEdit(row({ kind: "expense" }), "personal")).toBe(true);
		expect(canEdit(row({ kind: "income" }), "personal")).toBe(true);
		expect(canEdit(row({ kind: "contribution" }), "personal")).toBe(true);
	});

	it("never lets someone edit what the other person wrote", () => {
		expect(canEdit(row({ kind: "expense", mine: false }), "household")).toBe(false);
	});

	it("leaves ahorros and retiros to Ahorros", () => {
		expect(canEdit(row({ kind: "saving" }), "personal")).toBe(false);
		expect(canEdit(row({ kind: "withdrawal" }), "personal")).toBe(false);
	});

	it("an aporte is edited from Personal, not from Nuestro espacio", () => {
		expect(canEdit(row({ kind: "contribution" }), "household")).toBe(false);
		expect(canEdit(row({ kind: "expense" }), "household")).toBe(true);
	});
});

describe("rowAction", () => {
	it("edits your own gasto", () => {
		expect(rowAction(row({}), noHousehold)).toBe("edit");
	});

	it("does nothing for what you cannot edit", () => {
		expect(rowAction(row({ mine: false }), noHousehold)).toBeNull();
		expect(rowAction(row({ kind: "saving" }), noHousehold)).toBeNull();
	});

	it("in Nuestro espacio without Plus, your gasto or ingreso opens Plus", () => {
		const space = { space: "household" as const, household: plusOff };
		expect(rowAction(row({ kind: "expense" }), space)).toBe("plus");
		expect(rowAction(row({ kind: "income" }), space)).toBe("plus");
	});

	it("in Nuestro espacio with Plus, a gasto or ingreso cannot be tapped yet: Registrar is only Personal", () => {
		const space = { space: "household" as const, household: plusOn };
		expect(rowAction(row({ kind: "expense" }), space)).toBeNull();
		expect(rowAction(row({ kind: "income" }), space)).toBeNull();
	});

	it("in Nuestro espacio it waits for the household and does nothing without one", () => {
		expect(rowAction(row({}), { space: "household", household: undefined })).toBeNull();
		expect(rowAction(row({}), { space: "household", household: null })).toBeNull();
	});

	it("in Nuestro espacio what the other person wrote does nothing, with or without Plus", () => {
		const theirs = row({ mine: false });
		expect(rowAction(theirs, { space: "household", household: plusOff })).toBeNull();
		expect(rowAction(theirs, { space: "household", household: plusOn })).toBeNull();
	});

	it("in Personal a gasto is edited whatever the household says", () => {
		expect(rowAction(row({}), { ...noHousehold, household: plusOff })).toBe("edit");
		expect(rowAction(row({}), { ...noHousehold, household: plusOn })).toBe("edit");
	});

	it("an aporte waits for the household to load", () => {
		expect(rowAction(row({ kind: "contribution" }), noHousehold)).toBeNull();
	});

	it("an aporte with no household has nothing to open", () => {
		expect(
			rowAction(row({ kind: "contribution" }), { ...noHousehold, household: null }),
		).toBeNull();
	});

	it("an aporte is edited with Plus and opens Plus without it", () => {
		expect(rowAction(row({ kind: "contribution" }), { ...noHousehold, household: plusOn })).toBe(
			"edit",
		);
		expect(rowAction(row({ kind: "contribution" }), { ...noHousehold, household: plusOff })).toBe(
			"plus",
		);
	});

	it("an aporte is never tapped from Nuestro espacio, even with Plus", () => {
		expect(
			rowAction(row({ kind: "contribution" }), { space: "household", household: plusOn }),
		).toBeNull();
		expect(
			rowAction(row({ kind: "contribution" }), { space: "household", household: plusOff }),
		).toBeNull();
	});
});

describe("groupByDay", () => {
	it("groups rows by day and keeps the order they came in", () => {
		const rows = [
			row({ date: "2026-11-13", note: "a" }),
			row({ date: "2026-11-13", note: "b" }),
			row({ date: "2026-11-12", note: "c" }),
		];
		const groups = groupByDay(rows);
		expect(groups.map((group) => group.title)).toEqual(["2026-11-13", "2026-11-12"]);
		expect(groups[0].data.map((item) => item.note)).toEqual(["a", "b"]);
	});

	it("is empty without rows", () => {
		expect(groupByDay([])).toEqual([]);
	});
});

describe("filterRows", () => {
	const rows = [
		row({ kind: "expense" }),
		row({ kind: "income" }),
		row({ kind: "saving" }),
		row({ kind: "contribution" }),
	];

	it("Todos keeps everything", () => {
		expect(filterRows(rows, "Todos")).toHaveLength(4);
	});

	it("Gastos keeps only gastos and Ingresos only ingresos: ahorros and aportes are not income", () => {
		expect(filterRows(rows, "Gastos").map((item) => item.kind)).toEqual(["expense"]);
		expect(filterRows(rows, "Ingresos").map((item) => item.kind)).toEqual(["income"]);
	});
});

describe("dayTotalCents and signedAmount", () => {
	it("subtracts gastos and adds ingresos", () => {
		const total = dayTotalCents([
			row({ kind: "expense", amountCents: 1_500 }),
			row({ kind: "expense", amountCents: 4_590 }),
			row({ kind: "income", amountCents: 8_000 }),
		]);
		expect(total).toBe(1_910);
		expect(signedAmount(total)).toBe("+19.10");
	});

	it("ahorros, retiros and aportes do not move the day's total", () => {
		const total = dayTotalCents([
			row({ kind: "saving", amountCents: 20_000 }),
			row({ kind: "withdrawal", amountCents: 5_000 }),
			row({ kind: "contribution", amountCents: 3_000 }),
		]);
		expect(total).toBe(0);
		expect(signedAmount(total)).toBe("0.00");
	});

	it("a day of gastos is negative, with cents and thousands", () => {
		expect(signedAmount(-123_456)).toBe("−1,234.56");
		expect(signedAmount(5)).toBe("+0.05");
	});
});

describe("movementText", () => {
	it("a gasto shows its note, its envelope and a minus", () => {
		expect(movementText(row({ note: "almuerzo" }), null)).toEqual({
			name: "almuerzo",
			detail: "Necesidades",
			amount: "−15.00",
			tone: "default",
		});
	});

	it("a gasto without a note is just Gasto", () => {
		expect(movementText(row({ note: null }), null).name).toBe("Gasto");
	});

	it("an ahorro names its meta, or the fund when it has none", () => {
		const saving = row({ kind: "saving", amountCents: 20_000, envelope: "savings" });
		expect(movementText(saving, "Viaje")).toMatchObject({
			name: "Aporte a Viaje",
			detail: "Ahorro · no es gasto",
			amount: "200.00",
			tone: "savings",
		});
		expect(movementText(saving, null).name).toBe("Aporte al fondo");
	});

	it("an income says which cycle it is for", () => {
		const income = row({ kind: "income", envelope: null, amountCents: 300_000 });
		expect(movementText(income, null)).toMatchObject({
			detail: "Para este ciclo",
			amount: "+3,000.00",
		});
		expect(movementText({ ...income, extra: true }, null).detail).toBe("Extra");
		expect(movementText({ ...income, startsOn: "2026-12-01" }, null).detail).toBe("Para diciembre");
	});

	it("a retiro says why", () => {
		const withdrawal = row({ kind: "withdrawal", envelope: "savings", reason: "emergency" });
		expect(movementText(withdrawal, null)).toMatchObject({
			name: "Retiro del fondo",
			detail: "Emergencia",
		});
	});

	it("an aporte shows both envelopes and no sign", () => {
		const aporte = row({ kind: "contribution", toEnvelope: "savings", amountCents: 30_000 });
		expect(movementText(aporte, null)).toMatchObject({
			name: "Aporte a Nuestro espacio",
			detail: "Personal · Necesidades → Nuestro espacio · Ahorro",
			amount: "300.00",
		});
	});
});
