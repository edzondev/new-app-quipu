import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";

export type Row = FunctionReturnType<typeof api.transactions.list>["rows"][number];
type Envelope = NonNullable<Row["envelope"]>;
type Reason = NonNullable<Row["reason"]>;

export type Tone = "default" | "savings" | "income";

const REASON_LABELS: Record<Reason, string> = {
	emergency: "Emergencia",
	unexpected: "Algo imprevisto",
	mistake: "Me equivoqué al aportar",
	other: "Otro",
};

const label = (envelope: Envelope | null) => (envelope ? ENVELOPE_LABELS[envelope] : "");

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
	const amount = formatCents(row.amountCents);
	const name = (fallback: string) => row.note || fallback;
	switch (row.kind) {
		case "expense":
			return {
				name: name("Gasto"),
				detail: label(row.envelope),
				amount: `−${amount}`,
				tone: "default",
			};
		case "saving":
			return {
				name: name(goalName ? `Aporte a ${goalName}` : "Aporte al fondo"),
				detail: "Ahorro · no es gasto",
				amount,
				tone: "savings",
			};
		case "income":
			return {
				name: name("Ingreso"),
				detail: row.extra ? "Ingreso · Extra" : "Ingreso · Para este ciclo",
				amount,
				tone: "income",
			};
		case "withdrawal":
			return {
				name: name("Retiro del fondo"),
				detail: row.reason ? REASON_LABELS[row.reason] : "",
				amount,
				tone: "income",
			};
		case "contribution":
			return {
				name: name("Aporte a Nuestro espacio"),
				detail: `Personal · ${label(row.envelope)} → Nuestro espacio · ${label(row.toEnvelope)}`,
				amount,
				tone: "default",
			};
	}
}
