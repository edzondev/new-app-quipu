import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { monthName } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";

export type Row = FunctionReturnType<typeof api.transactions.list>["rows"][number];
type Envelope = NonNullable<Row["envelope"]>;
type Reason = NonNullable<Row["reason"]>;

export type Tone = "default" | "savings";

export const FILTERS = ["Todos", "Gastos", "Ingresos"] as const;
export type Filter = (typeof FILTERS)[number];

const FILTER_KIND = { Gastos: "expense", Ingresos: "income" } as const;

const REASON_LABELS: Record<Reason, string> = {
	emergency: "Emergencia",
	unexpected: "Algo imprevisto",
	mistake: "Me equivoqué al aportar",
	other: "Otro",
};

const label = (envelope: Envelope | null) => (envelope ? ENVELOPE_LABELS[envelope] : "");

export function filterRows(rows: Row[], filter: Filter) {
	return filter === "Todos" ? rows : rows.filter((row) => row.kind === FILTER_KIND[filter]);
}

function effectCents(row: Row) {
	switch (row.kind) {
		case "expense":
			return -row.amountCents;
		case "income":
			return row.amountCents;
		default:
			return 0;
	}
}

export function dayTotalCents(rows: Row[]) {
	return rows.reduce((total, row) => total + effectCents(row), 0);
}

export function signedAmount(cents: number) {
	const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
	return `${sign}${formatCents(Math.abs(cents))}`;
}

/** Rows come newest first, so each day's rows stay in the same order. */
export function groupByDay(rows: Row[]) {
	const byDate = new Map<string, Row[]>();
	for (const row of rows) {
		const day = byDate.get(row.date);
		if (day) day.push(row);
		else byDate.set(row.date, [row]);
	}
	return [...byDate].map(([title, data]) => ({ title, data }));
}

/** Texts of one row. `goalName` is the name of `row.goalId`, when it has one. */
export function movementText(
	row: Row,
	goalName: string | null,
): { name: string; detail: string; amount: string; tone: Tone } {
	const name = (fallback: string) => row.note || fallback;
	switch (row.kind) {
		case "expense":
			return {
				name: name("Gasto"),
				detail: label(row.envelope),
				amount: signedAmount(effectCents(row)),
				tone: "default",
			};
		case "saving":
			return {
				name: name(goalName ? `Aporte a ${goalName}` : "Aporte al fondo"),
				detail: "Ahorro · no es gasto",
				amount: formatCents(row.amountCents),
				tone: "savings",
			};
		case "income":
			return {
				name: name("Ingreso"),
				detail: row.startsOn
					? `Para ${monthName(row.startsOn)}`
					: row.extra
						? "Extra"
						: "Para este ciclo",
				amount: signedAmount(effectCents(row)),
				tone: "default",
			};
		case "withdrawal":
			return {
				name: name("Retiro del fondo"),
				detail: row.reason ? REASON_LABELS[row.reason] : "",
				amount: signedAmount(row.amountCents),
				tone: "default",
			};
		case "contribution":
			return {
				name: name("Aporte a Nuestro espacio"),
				detail: `Personal · ${label(row.envelope)} → Nuestro espacio · ${label(row.toEnvelope)}`,
				amount: formatCents(row.amountCents),
				tone: "default",
			};
	}
}
