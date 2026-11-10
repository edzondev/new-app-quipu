import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS } from "@quipu/backend/shared/budget";
import { dueDateFor, ruleText } from "@quipu/backend/shared/commitments";
import { formatPastDay, formatWeekdayDay, monthName } from "@quipu/backend/shared/dates";
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

/** The day of the month the rule gives in the month of this charge, ignoring a one-month change. */
export function ruleDay(item: CommitmentItem): number | null {
	if (!item.rule) return null;
	return Number(dueDateFor(item.rule, undefined, item.dueDate.slice(0, 7)).slice(8));
}

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** The title of the one-month change: "Este mes vence…", or the real month when it is not this one. */
export function dueMonthTitle(month: string, today: string) {
	return month === today.slice(0, 7) ? "Este mes vence…" : `${capitalize(monthName(month))} vence…`;
}

/** "Agua vence el 27 este mes", or "Agua vence el 27 de diciembre" for another month. */
export function dueMonthToast(name: string, day: number, month: string, today: string) {
	const when = month === today.slice(0, 7) ? "este mes" : `de ${monthName(month)}`;
	return `${name} vence el ${day} ${when}`;
}

/** The adjustment a charge carries, rebuilt from its date: what the preview of the edit form needs. */
export function adjustmentOf(item: CommitmentItem) {
	return item.adjusted
		? { month: item.dueDate.slice(0, 7), day: Number(item.dueDate.slice(8)) }
		: undefined;
}

/** "cada mes el 28", or "el 27 · solo este mes" when this month was moved by hand. */
function describeRule(item: CommitmentItem) {
	if (!item.rule) return ENVELOPE_LABELS[item.envelope];
	if (item.adjusted) return `el ${Number(item.dueDate.slice(8))} · solo este mes`;
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
