import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { monthName } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";
import { REASON_LABELS } from "@/features/savings/withdraw-form";

export type Row = FunctionReturnType<typeof api.transactions.list>["rows"][number];
type Envelope = NonNullable<Row["envelope"]>;

export type Tone = "default" | "savings";

export const FILTERS = ["Todos", "Gastos", "Ingresos"] as const;
export type Filter = (typeof FILTERS)[number];

const FILTER_KIND = { Gastos: "expense", Ingresos: "income" } as const;

const label = (envelope: Envelope | null) => (envelope ? ENVELOPE_LABELS[envelope] : "");

type Space = "personal" | "household";
/** The household as far as a row cares: null without one, undefined while it loads. */
type Household = Pick<NonNullable<FunctionReturnType<typeof api.household.get>>, "plus"> | null;

// The functions below ask only for the fields they read, so a test needs no id.
const EDITABLE_KINDS: readonly Row["kind"][] = ["expense", "income", "contribution"];

/** What Registrar edits: only the author's gastos, ingresos and aportes. Ahorros and retiros have their own sheet. */
export function canEdit(row: Pick<Row, "mine" | "kind">, space: Space): boolean {
	return (
		row.mine &&
		EDITABLE_KINDS.includes(row.kind) &&
		(row.kind !== "contribution" || space === "personal")
	);
}

/**
 * What tapping a row does: edit it in Registrar ("edit"), in Aportar or Retirar ("editSaving"), open Plus
 * when the household has none, or nothing. Decided with the real household, like the web. An aporte waits
 * for the household to load. Registrar only works in Personal for now, so in Nuestro espacio a gasto or
 * ingreso cannot be edited yet: without Plus it leads to Plus, with Plus it does nothing.
 */
export function rowAction(
	row: Pick<Row, "mine" | "kind">,
	{ space, household }: { space: Space; household: Household | undefined },
): "edit" | "editSaving" | "plus" | null {
	if (row.kind === "saving" || row.kind === "withdrawal") {
		if (!row.mine) return null;
		if (space === "personal") return "editSaving";
		if (!household) return null;
		return household.plus.active ? "editSaving" : "plus";
	}
	if (!canEdit(row, space)) return null;
	if (row.kind === "contribution") {
		if (!household) return null;
		return household.plus.active ? "edit" : "plus";
	}
	if (space === "household") return household?.plus.active === false ? "plus" : null;
	return "edit";
}

export function filterRows<T extends Pick<Row, "kind">>(rows: T[], filter: Filter): T[] {
	return filter === "Todos" ? rows : rows.filter((row) => row.kind === FILTER_KIND[filter]);
}

function effectCents(row: Pick<Row, "kind" | "amountCents">) {
	switch (row.kind) {
		case "expense":
			return -row.amountCents;
		case "income":
			return row.amountCents;
		default:
			return 0;
	}
}

export function dayTotalCents(rows: Pick<Row, "kind" | "amountCents">[]) {
	return rows.reduce((total, row) => total + effectCents(row), 0);
}

export function signedAmount(cents: number) {
	const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
	return `${sign}${formatCents(Math.abs(cents))}`;
}

/** Rows come newest first, so each day's rows stay in the same order. */
export function groupByDay<T extends Pick<Row, "date">>(rows: T[]) {
	const byDate = new Map<string, T[]>();
	for (const row of rows) {
		const day = byDate.get(row.date);
		if (day) day.push(row);
		else byDate.set(row.date, [row]);
	}
	return [...byDate].map(([title, data]) => ({ title, data }));
}

/** Texts of one row. `goalName` is the name of `row.goalId`, when it has one. */
export function movementText(
	row: Omit<Row, "id">,
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
