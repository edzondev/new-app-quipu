import { addDays, formatDay, getNextCycleRange } from "./dates";
import {
	BIWEEKLY_LAST_LABEL,
	type Cadence,
	type CycleStartDay,
	MAX_MONTH_DAY,
	type Plan,
	parseStartDay,
	WEEKDAY_NAMES,
} from "./plan";

/** What Primeros pasos asks. "variable" is only in the form: it is saved as a monthly plan from day 1. */
export const FREQUENCIES = ["monthly", "biweekly", "weekly", "variable"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export function isFrequency(value: string): value is Frequency {
	return FREQUENCIES.some((frequency) => frequency === value);
}

/** The pay day a frequency starts with, as the string the day select holds. */
export const DEFAULT_START_DAY: Record<Frequency, string> = {
	monthly: "last",
	biweekly: "last",
	weekly: "5",
	variable: "1",
};

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * What the pay day select offers: weekdays from Monday, or month days (1 to 14 for biweekly) and "last".
 * A `saved` day the list no longer offers (a biweekly 15 to 31) stays in it, so the select shows it.
 */
export function getStartDayOptions(cadence: Cadence, saved?: string) {
	if (cadence === "weekly") {
		return WEEK_ORDER.map((day) => ({
			value: String(day),
			label: WEEKDAY_NAMES[day].replace(/^./, (letter) => letter.toUpperCase()),
		}));
	}
	const lastNumbered = cadence === "biweekly" ? 14 : MAX_MONTH_DAY;
	const numbered = Array.from({ length: lastNumbered }, (_, index) => ({
		value: String(index + 1),
		label: `Día ${index + 1}`,
	}));
	const isOffered =
		saved === undefined || saved === "last" || numbered.some((o) => o.value === saved);
	return [
		...numbered,
		...(isOffered ? [] : [{ value: saved, label: `Día ${saved}` }]),
		{ value: "last", label: cadence === "biweekly" ? BIWEEKLY_LAST_LABEL : "Fin de mes" },
	];
}

export function getStartDayTitle(cadence: Cadence) {
	return cadence === "biweekly" ? "¿Qué días te pagan?" : "¿Qué día te pagan?";
}

export function getStartDayHelp(cadence: Cadence) {
	return cadence === "biweekly" ? "Día 1 a 14: ese día y 15 días después." : undefined;
}

/** The plan a frequency and a day are saved as. Without a fixed pay, a monthly plan from day 1. */
export function resolveCycle(
	frequency: Frequency,
	startDay: string,
): { cadence: Cadence; cycleStartDay: CycleStartDay } {
	return frequency === "variable"
		? { cadence: "monthly", cycleStartDay: 1 }
		: { cadence: frequency, cycleStartDay: parseStartDay(startDay) };
}

/** "Te pagan el 3 y el 18." */
export function describePayday(frequency: Frequency, startDay: CycleStartDay) {
	switch (frequency) {
		case "variable":
			return "Planeamos por mes, del 1 a fin de mes.";
		case "weekly":
			return `Te pagan cada ${WEEKDAY_NAMES[Number(startDay)]}.`;
		case "biweekly":
			return startDay === "last"
				? "Te pagan el 15 y a fin de mes."
				: `Te pagan el ${startDay} y el ${Number(startDay) + 15}.`;
		case "monthly":
			return startDay === "last" ? "Te pagan a fin de mes." : `Te pagan el día ${startDay}.`;
	}
}

/** "del 1 al 14 nov" inside a month, "del 1 nov al 14 dic" across two. */
function describeSpan(startDate: string, endDate: string) {
	return startDate.slice(0, 7) === endDate.slice(0, 7)
		? `del ${Number(startDate.slice(8))} al ${formatDay(endDate)}`
		: `del ${formatDay(startDate)} al ${formatDay(endDate)}`;
}

/** What Ajustes tells before saving a new cycle: when the open one closes, the next one, and the pay days from then on. */
export function describeCycleChange(nextPlan: Plan, currentEnd: string) {
	const { cadence, cycleStartDay } = nextPlan;
	const next = getNextCycleRange(cadence, cycleStartDay, addDays(currentEnd, 1));
	const payday = describePayday(cadence, cycleStartDay);
	return `Tu ciclo actual cierra el ${formatDay(currentEnd)}. El siguiente va ${describeSpan(next.startDate, next.endDate)}. Desde ahí, ${payday.charAt(0).toLowerCase()}${payday.slice(1)}`;
}
