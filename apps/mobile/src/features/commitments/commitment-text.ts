import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS } from "@quipu/backend/shared/budget";
import {
	type CommitmentStatus,
	canPay,
	isAdjusted,
	ruleDay,
} from "@quipu/backend/shared/commitments";
import { addDays, formatDay, formatPastDay } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";

type CommitmentList = FunctionReturnType<typeof api.commitments.list>;
type Item = CommitmentList["items"][number];
type Payment = CommitmentList["payments"][number];

function dueWhen(
	{ dueDate, frequency }: Pick<Item, "dueDate" | "frequency">,
	status: CommitmentStatus,
	today: string,
) {
	if (status === "later") return formatDay(dueDate);
	if (status !== "paid" && dueDate === today) return "Hoy";
	if (status !== "paid" && dueDate === addDays(today, 1)) return "Mañana";
	return frequency === "monthly" ? `Día ${Number(dueDate.slice(8))}` : formatDay(dueDate);
}

export function dueLine(
	commitment: Pick<Item, "dueDate" | "envelope" | "frequency">,
	status: CommitmentStatus,
	today: string,
) {
	const frequency = commitment.frequency === "monthly" ? "cada mes" : "una vez";
	return `${dueWhen(commitment, status, today)} · ${ENVELOPE_LABELS[commitment.envelope]} · ${frequency}`;
}

export function paidBeforeLine(
	{ paidOn, envelope }: Pick<Payment, "paidOn" | "envelope">,
	today: string,
) {
	return `Pagado el ${formatPastDay(paidOn, today)} · ${ENVELOPE_LABELS[envelope]}`;
}

export function paymentFrequency(payment: Payment, items: Item[]): Item["frequency"] {
	return items.some((item) => item.id === payment.id && item.frequency === "monthly")
		? "monthly"
		: "once";
}

/** Who can pay is the web's rule (`canPay`); the words are the design's. */
export function payLabel(item: Pick<Item, "status" | "frequency">) {
	if (!canPay(item)) return null;
	return item.status === "overdue" ? "Vencido · marcar pagado" : "Marcar pagado";
}

/** F3: "Luz · vencía el 28 oct", or "vence el" when the date has not passed. */
export function payHeading({ name, dueDate }: Pick<Item, "name" | "dueDate">, today: string) {
	return `${name} · ${dueDate < today ? "vencía" : "vence"} el ${formatDay(dueDate)}`;
}

/** "Volver al 28" when this month's date was moved by hand; null otherwise. */
export function backToRuleLabel(item: Pick<Item, "rule" | "adjustment" | "dueDate">) {
	const day = ruleDay(item);
	return isAdjusted(item) && day !== null ? `Volver al ${day}` : null;
}
