import {
	BIWEEKLY_LAST_LABEL,
	type Cadence,
	type CycleStartDay,
	MAX_MONTH_DAY,
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

/** What the pay day select offers: weekdays from Monday, or month days (1 to 14 for biweekly) and "last". */
export function getStartDayOptions(cadence: Cadence) {
	if (cadence === "weekly") {
		return WEEK_ORDER.map((day) => ({
			value: String(day),
			label: WEEKDAY_NAMES[day].replace(/^./, (letter) => letter.toUpperCase()),
		}));
	}
	const lastNumbered = cadence === "biweekly" ? 14 : MAX_MONTH_DAY;
	return [
		...Array.from({ length: lastNumbered }, (_, index) => ({
			value: String(index + 1),
			label: `Día ${index + 1}`,
		})),
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
