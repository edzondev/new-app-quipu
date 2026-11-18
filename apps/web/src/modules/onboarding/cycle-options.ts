import type { Cadence } from "@quipu/backend/shared/plan";
import { FREQUENCIES, FREQUENCY_LABELS } from "@quipu/backend/shared/start-day";

export const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
	{ value: "monthly", label: "Cada mes" },
	{ value: "biweekly", label: "Cada quincena" },
	{ value: "weekly", label: "Cada semana" },
];

export const FREQUENCY_OPTIONS = FREQUENCIES.map((value) => ({
	value,
	label: FREQUENCY_LABELS[value],
}));
