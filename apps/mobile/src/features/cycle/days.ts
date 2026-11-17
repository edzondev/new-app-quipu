import { addDays, formatDay, getNextCycleRange } from "@quipu/backend/shared/dates";
import type { Cadence, CycleStartDay, Plan, Split } from "@quipu/backend/shared/plan";

/** What the cycle depends on: how often and from which day. */
export type Cycle = Pick<Plan, "cadence" | "cycleStartDay">;

export const CADENCE_ORDER = [
	"monthly",
	"biweekly",
	"weekly",
] as const satisfies readonly Cadence[];
export const CADENCE_LABELS = ["Cada mes", "Cada quincena", "Cada semana"] as const;

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** «Cada semana» shows Monday to Sunday. The values are weekday numbers: 0 is Sunday. */
export const WEEK_CELLS = [
	{ value: 1, label: "lun" },
	{ value: 2, label: "mar" },
	{ value: 3, label: "mié" },
	{ value: 4, label: "jue" },
	{ value: 5, label: "vie" },
	{ value: 6, label: "sáb" },
	{ value: 0, label: "dom" },
] as const;

export const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export function cadenceLabel(cadence: Cadence) {
	return CADENCE_LABELS[CADENCE_ORDER.indexOf(cadence)];
}

/** «Día 15», «Último día» or the weekday. */
export function startDayLabel(cadence: Cadence, day: CycleStartDay) {
	if (cadence === "weekly") return WEEKDAYS[Number(day)];
	return day === "last" ? "Último día" : `Día ${day}`;
}

/** The value of the cycle row in Ajustes: «Cada mes · día 15». */
export function cycleRowValue({ cadence, cycleStartDay }: Cycle) {
	return `${cadenceLabel(cadence)} · ${startDayLabel(cadence, cycleStartDay).toLowerCase()}`;
}

/** «cada mes, del 1 al 31» for a monthly cycle that starts on a day; otherwise «cada mes, desde el día 15». */
export function currentCycleText({ cadence, cycleStartDay }: Cycle) {
	const every = cadenceLabel(cadence).toLowerCase();
	if (cadence === "monthly" && cycleStartDay !== "last") {
		return `${every}, del ${cycleStartDay} al ${cycleStartDay === 1 ? 31 : cycleStartDay - 1}`;
	}
	return `${every}, desde ${startPhrase(cadence, cycleStartDay)}`;
}

function startPhrase(cadence: Cadence, day: CycleStartDay) {
	if (cadence === "weekly") return `el ${startDayLabel(cadence, day).toLowerCase()}`;
	return day === "last" ? "el último día del mes" : `el día ${day}`;
}

/** What L6 tells before saving: the open cycle closes on its date, the next one bridges to the new start day. */
export function cycleChangeNote({ cadence, cycleStartDay }: Cycle, currentEndDate: string) {
	const next = getNextCycleRange(cadence, cycleStartDay, addDays(currentEndDate, 1));
	const from = formatDay(addDays(next.endDate, 1));
	return `Tu ciclo actual cierra el ${formatDay(currentEndDate)}. El siguiente va del ${formatDay(next.startDate)} al ${formatDay(next.endDate)}. Desde el ${from}, ${cadenceLabel(cadence).toLowerCase()} desde ${startPhrase(cadence, cycleStartDay)}.`;
}

/** «50 · 30 · 20». */
export function splitRowValue({ needs, wants, savings }: Split) {
	return `${needs} · ${wants} · ${savings}`;
}
