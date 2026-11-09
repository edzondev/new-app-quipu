import { formatCents } from "./budget";
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

/** "Ana cambió el reparto" / "Tú cambiaste el reparto". */
export function activityText(type: EventType, mine: boolean, name: string) {
	const [theirs, yours] = PHRASES[type];
	return mine ? `Tú ${yours}` : `${name} ${theirs}`;
}

export const moneyLabel = (cents: number) => `S/ ${formatCents(cents)}`;

/** "50 · 30 · 20". */
export const splitLabel = ({ needs, wants, savings }: Split) => `${needs} · ${wants} · ${savings}`;

/** "Mercado · S/ 45.00"; just the amount when there is no name. */
export const rowLabel = (name: string | undefined, cents: number) =>
	[name, moneyLabel(cents)].filter(Boolean).join(" · ");
