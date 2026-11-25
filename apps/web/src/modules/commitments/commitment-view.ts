import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS } from "@quipu/backend/shared/budget";
import { isAdjusted, ruleText } from "@quipu/backend/shared/commitments";
import { formatPastDay, formatWeekdayDay, monthName } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";

type CommitmentList = FunctionReturnType<typeof api.commitments.list>;
export type CommitmentItem = CommitmentList["items"][number];
export type Payment = CommitmentList["payments"][number];

export function describePaid(
	{ paidOn, envelope }: Pick<Payment, "paidOn" | "envelope">,
	today: string,
) {
	return `Pagado el ${formatPastDay(paidOn, today)} · ${ENVELOPE_LABELS[envelope]}`;
}

/** "Agua vence el 27 este mes", or "Agua vence el 27 de diciembre" for another month. */
export function dueMonthToast(name: string, day: number, month: string, today: string) {
	const when = month === today.slice(0, 7) ? "este mes" : `de ${monthName(month)}`;
	return `${name} vence el ${day} ${when}`;
}

/** "cada mes el 28", or "el 27 · solo este mes" when this month was moved by hand. */
function describeRule(item: CommitmentItem) {
	if (!item.rule) return ENVELOPE_LABELS[item.envelope];
	if (isAdjusted(item)) return `el ${Number(item.dueDate.slice(8))} · solo este mes`;
	return `cada mes ${ruleText(item.rule)}`;
}

export function describeDue(item: CommitmentItem, today: string) {
	const date = formatWeekdayDay(item.dueDate);
	const rule = describeRule(item);
	switch (item.status) {
		case "paid":
			return describePaid(item, today);
		case "overdue":
			return `Venció el ${date} · ${rule}`;
		case "later":
			return `${date} · ${rule}`;
		case "upcoming":
		case "reserved":
			return `Vence el ${date} · ${rule}`;
	}
}
