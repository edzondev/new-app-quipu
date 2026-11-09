import { formatCents } from "./budget";
import { getLimaDate } from "./dates";
import type { Split } from "./plan";

export const EVENT_TYPES = [
	"split_changed",
	"cycle_changed",
	"renamed",
	"fund_goal_changed",
	"goal_added",
	"goal_edited",
	"goal_removed",
	"commitment_added",
	"commitment_edited",
	"commitment_paid",
	"commitment_removed",
	"expense_edited",
	"expense_deleted",
	"income_edited",
	"income_deleted",
	"saving_added",
	"withdrawal",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// [what someone else did, what you did]
const PHRASES: Record<EventType, [string, string]> = {
	split_changed: ["cambió el reparto", "cambiaste el reparto"],
	cycle_changed: ["cambió el ciclo", "cambiaste el ciclo"],
	renamed: ["cambió el nombre", "cambiaste el nombre"],
	fund_goal_changed: ["editó la meta del fondo", "editaste la meta del fondo"],
	goal_added: ["creó una meta", "creaste una meta"],
	goal_edited: ["editó una meta", "editaste una meta"],
	goal_removed: ["borró una meta", "borraste una meta"],
	commitment_added: ["creó un compromiso", "creaste un compromiso"],
	commitment_edited: ["editó un compromiso", "editaste un compromiso"],
	commitment_paid: ["marcó pagado", "marcaste pagado"],
	commitment_removed: ["borró un compromiso", "borraste un compromiso"],
	expense_edited: ["editó un gasto", "editaste un gasto"],
	expense_deleted: ["borró un gasto", "borraste un gasto"],
	income_edited: ["editó un ingreso", "editaste un ingreso"],
	income_deleted: ["borró un ingreso", "borraste un ingreso"],
	saving_added: ["aportó al ahorro", "aportaste al ahorro"],
	withdrawal: ["retiró del fondo", "retiraste del fondo"],
};

/** "Ana cambió el reparto" / "Tú cambiaste el reparto". Without a name: "Cambió el reparto". */
export function activityText(type: EventType, mine: boolean, name: string) {
	const [theirs, yours] = PHRASES[type];
	if (mine) return `Tú ${yours}`;
	return name ? `${name} ${theirs}` : `${theirs.charAt(0).toUpperCase()}${theirs.slice(1)}`;
}

type EventDetail = {
	detail: string | null;
	before: string | null;
	after: string | null;
	amountCents: number | null;
};

/** The small line under an event: what it was about, its amount and "antes → después". */
export function eventLine({ detail, before, after, amountCents }: EventDetail) {
	const change = before !== null && after !== null ? `${before} → ${after}` : null;
	const amount = amountCents === null ? null : moneyLabel(amountCents);
	return [detail, amount, change].filter((part) => part !== null).join(" · ");
}

/** Events (newest first) grouped by their day in Lima. */
export function groupEventsByDay<T extends { at: number }>(events: T[]) {
	const groups: { date: string; events: T[] }[] = [];
	for (const event of events) {
		const date = getLimaDate(new Date(event.at));
		const last = groups.at(-1);
		if (last?.date === date) last.events.push(event);
		else groups.push({ date, events: [event] });
	}
	return groups;
}

export const moneyLabel = (cents: number) => `S/ ${formatCents(cents)}`;

/** "50 · 30 · 20". */
export const splitLabel = ({ needs, wants, savings }: Split) => `${needs} · ${wants} · ${savings}`;

/** "Mercado · S/ 45.00"; just the amount when there is no name. */
export const rowLabel = (name: string | undefined, cents: number) =>
	[name, moneyLabel(cents)].filter(Boolean).join(" · ");
