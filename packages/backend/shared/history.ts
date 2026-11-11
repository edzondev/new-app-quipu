import { type Envelope, ENVELOPE_LABELS } from "./budget";

type Kind = "expense" | "income" | "contribution" | "saving" | "withdrawal";

export type HistoryRow = {
	date: string;
	kind: Kind;
	envelope: Envelope | null;
	note: string | null;
	amountCents: number;
	who: string | null;
	auto: boolean;
};

const KIND_LABELS: Record<Kind, string> = {
	expense: "Gasto",
	income: "Ingreso",
	contribution: "Aporte",
	saving: "Ahorro",
	withdrawal: "Retiro",
};

const HEADER = ["Fecha", "Tipo", "Sobre", "Concepto", "Monto", "Quién"];

/**
 * One CSV field. Quoted when it holds a comma, a quote or a line break; a leading = + - @ gets a
 * quote mark so a spreadsheet shows what someone wrote instead of running it as a formula.
 */
function field(value: string) {
	const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
	return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function amount({ kind, amountCents }: HistoryRow) {
	const sign = kind === "expense" || kind === "withdrawal" ? -1 : 1;
	return ((sign * amountCents) / 100).toFixed(2);
}

/** The household history as UTF-8 CSV with a BOM, so Excel reads the accents. */
export function historyCsv(rows: HistoryRow[]) {
	const lines = rows.map((row) =>
		[
			row.date,
			KIND_LABELS[row.kind],
			row.envelope ? ENVELOPE_LABELS[row.envelope] : "",
			field(row.note ?? ""),
			amount(row),
			field(row.auto ? "Automático" : (row.who ?? "Cuenta eliminada")),
		].join(","),
	);
	return `﻿${[HEADER.join(","), ...lines].join("\r\n")}`;
}

export const historyFileName = (today: string) => `quipu-nuestro-espacio-${today}.csv`;
