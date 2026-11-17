import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS } from "@quipu/backend/shared/budget";
import type { CommitmentStatus } from "@quipu/backend/shared/commitments";
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

export function payLabel(status: CommitmentStatus) {
	if (status === "overdue") return "Vencido · marcar pagado";
	if (status === "upcoming") return "Marcar pagado";
	return null;
}
