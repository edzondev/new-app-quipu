import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";

/** K1c: the toast that says the trial began. The date comes from the server, in Lima time. */
export function trialStartedText(endsAt: number) {
	return `Prueba de Plus activa. Termina el ${formatDay(getLimaDate(new Date(endsAt)))}.`;
}
