import type { Cadence, CycleStartDay, Plan, Split } from "@quipu/backend/shared/plan";
import { getStartDayLabel } from "@quipu/backend/shared/start-day";

export type Cycle = Pick<Plan, "cadence" | "cycleStartDay">;

export const CADENCE_ORDER = [
	"monthly",
	"biweekly",
	"weekly",
] as const satisfies readonly Cadence[];
export const CADENCE_LABELS = ["Cada mes", "Cada quincena", "Cada semana"] as const;

export function cadenceLabel(cadence: Cadence) {
	return CADENCE_LABELS[CADENCE_ORDER.indexOf(cadence)];
}

export function cycleRowValue({ cadence, cycleStartDay }: Cycle) {
	return `${cadenceLabel(cadence)} · ${getStartDayLabel(cadence, cycleStartDay).toLowerCase()}`;
}

export function currentCycleText({ cadence, cycleStartDay }: Cycle) {
	const every = cadenceLabel(cadence).toLowerCase();
	if (cadence === "monthly" && cycleStartDay !== "last") {
		return `${every}, del ${cycleStartDay} al ${cycleStartDay === 1 ? 31 : cycleStartDay - 1}`;
	}
	return `${every}, desde ${startPhrase(cadence, cycleStartDay)}`;
}

function startPhrase(cadence: Cadence, day: CycleStartDay) {
	if (cadence === "weekly") return `el ${getStartDayLabel(cadence, day).toLowerCase()}`;
	return day === "last" ? "el último día del mes" : `el día ${day}`;
}

export function splitRowValue({ needs, wants, savings }: Split) {
	return `${needs} · ${wants} · ${savings}`;
}
