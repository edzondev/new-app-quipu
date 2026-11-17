import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";

export function trialStartedText(endsAt: number) {
	return `Prueba de Plus activa. Termina el ${formatDay(getLimaDate(new Date(endsAt)))}.`;
}
