import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS } from "@quipu/backend/shared/budget";
import { daysBetween, formatDay } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";

export type CommitmentItem = FunctionReturnType<typeof api.commitments.list>["items"][number];

const GROUP_OF = {
	overdue: "pending",
	upcoming: "pending",
	reserved: "pending",
	later: "later",
	paid: "paid",
} as const satisfies Record<CommitmentItem["status"], string>;

export function groupCommitments(items: CommitmentItem[]) {
	const groups: Record<(typeof GROUP_OF)[CommitmentItem["status"]], CommitmentItem[]> = {
		pending: [],
		later: [],
		paid: [],
	};
	for (const item of items) groups[GROUP_OF[item.status]].push(item);
	return groups;
}

/** A monthly that is not due this cycle cannot be paid ahead; a one-off can. */
export function canPay({ status, frequency }: CommitmentItem) {
	return status !== "paid" && (status !== "later" || frequency === "once");
}

export function describeDue(item: CommitmentItem, today: string) {
	const envelope = ENVELOPE_LABELS[item.envelope];
	const date = formatDay(item.dueDate);
	switch (item.status) {
		case "paid":
			return `Pagado · ${envelope}`;
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
