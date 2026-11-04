import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS } from "@quipu/backend/shared/budget";
import { daysBetween, formatDay, formatPastDay } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";

type CommitmentList = FunctionReturnType<typeof api.commitments.list>;
export type CommitmentItem = CommitmentList["items"][number];
export type Payment = CommitmentList["payments"][number];

export function groupCommitments(items: CommitmentItem[]) {
	const groups: Record<"pending" | "later" | "paidBefore", CommitmentItem[]> = {
		pending: [],
		later: [],
		paidBefore: [],
	};
	for (const item of items) {
		if (item.status === "paid") groups.paidBefore.push(item);
		else if (item.status === "later") groups.later.push(item);
		else groups.pending.push(item);
	}
	return groups;
}

/** A monthly that is not due this cycle cannot be paid ahead; a one-off can. */
export function canPay({ status, frequency }: CommitmentItem) {
	return status !== "paid" && (status !== "later" || frequency === "once");
}

export function describePaid(
	{ paidOn, envelope }: Pick<Payment, "paidOn" | "envelope">,
	today: string,
) {
	return `Pagado el ${formatPastDay(paidOn, today)} · ${ENVELOPE_LABELS[envelope]}`;
}

export function describeDue(item: CommitmentItem, today: string) {
	const envelope = ENVELOPE_LABELS[item.envelope];
	const date = formatDay(item.dueDate);
	switch (item.status) {
		case "paid":
			return describePaid(item, today);
		case "overdue":
			return `Venció el ${date} · ${envelope}`;
		case "later":
			return `${date} · ${envelope}`;
		case "upcoming": {
			const days = daysBetween(today, item.dueDate);
			const when = days === 0 ? "Hoy" : days === 1 ? "Mañana" : `Vence en ${days} días`;
			return `${when} · ${envelope}`;
		}
		case "reserved":
			return `Vence el ${date} · ${envelope}`;
	}
}
