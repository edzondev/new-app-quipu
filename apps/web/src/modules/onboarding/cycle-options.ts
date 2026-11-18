import type { Cadence } from "@quipu/backend/shared/plan";
import type { Frequency } from "@quipu/backend/shared/start-day";

export const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
	{ value: "monthly", label: "Cada mes" },
	{ value: "biweekly", label: "Cada quincena" },
	{ value: "weekly", label: "Cada semana" },
];

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
	...CADENCE_OPTIONS,
	{ value: "variable", label: "No tengo sueldo fijo" },
];
