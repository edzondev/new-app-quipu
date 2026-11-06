import { formatCents } from "./budget";
import { formatDay } from "./dates";

type CloseNotice = { newCycleStart: string; carriedCents: number; fundedCents: number };

export function closeNoticeText({ newCycleStart, carriedCents, fundedCents }: CloseNotice) {
	const sentences = [`Empezó tu ciclo del ${formatDay(newCycleStart)}.`];
	if (carriedCents > 0) {
		sentences.push(`Incluye S/ ${formatCents(carriedCents)} que sobraron en Necesidades y Gustos.`);
	}
	if (carriedCents < 0) {
		sentences.push(`Te pasaste por S/ ${formatCents(-carriedCents)} en tu ciclo anterior.`);
	}
	if (fundedCents > 0) {
		sentences.push(`Los S/ ${formatCents(fundedCents)} de Ahorro pasaron a tu fondo.`);
	}
	return sentences.join(" ");
}
