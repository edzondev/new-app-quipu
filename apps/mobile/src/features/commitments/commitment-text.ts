import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS } from "@quipu/backend/shared/budget";
import type { CommitmentStatus } from "@quipu/backend/shared/commitments";
import { addDays, formatDay } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";

type CommitmentList = FunctionReturnType<typeof api.commitments.list>;
type Item = CommitmentList["items"][number];
type Payment = CommitmentList["payments"][number];

function dueWhen(
	{ dueDate, frequency }: Pick<Item, "dueDate" | "frequency">,
	paid: boolean,
	today: string,
) {
	if (!paid && dueDate === today) return "Hoy";
	if (!paid && dueDate === addDays(today, 1)) return "Mañana";
	return frequency === "monthly" ? `Día ${Number(dueDate.slice(8))}` : formatDay(dueDate);
}

export function dueLine(
	commitment: Pick<Item, "dueDate" | "envelope" | "frequency">,
	paid: boolean,
	today: string,
) {
	const frequency = commitment.frequency === "monthly" ? "cada mes" : "una vez";
	return `${dueWhen(commitment, paid, today)} · ${ENVELOPE_LABELS[commitment.envelope]} · ${frequency}`;
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
