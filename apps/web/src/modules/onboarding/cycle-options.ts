import { type Cadence, MAX_MONTH_DAY } from "@quipu/backend/shared/plan";

export const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
	{ value: "monthly", label: "Cada mes" },
	{ value: "biweekly", label: "Cada quincena" },
	{ value: "weekly", label: "Cada semana" },
];

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** What "Empieza el" can pick: weekdays for weekly, month days and the last day otherwise. */
export function getStartDayOptions(cadence: Cadence) {
	if (cadence === "weekly") {
		return WEEKDAYS.map((label, index) => ({ value: String(index), label }));
	}
	return [
		...Array.from({ length: MAX_MONTH_DAY }, (_, index) => ({
			value: String(index + 1),
			label: `Día ${index + 1}`,
		})),
		{ value: "last", label: "Último día del mes" },
	];
}
