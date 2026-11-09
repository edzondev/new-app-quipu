import { formatCents } from "./budget";
import { formatDay } from "./dates";

type CloseNotice = { newCycleStart: string; carriedCents: number; fundedCents: number };

type HouseholdCloseNotice = { newCycleStart: string; surplusCents: number; shortfallCents: number };

/** The household's notice: what Necesidades and Gustos left together, which moves to Ahorro. A deficit is not carried. */
export function householdCloseNoticeText({
	newCycleStart,
	surplusCents,
	shortfallCents,
}: HouseholdCloseNotice) {
	const start = `Empezó el ciclo del ${formatDay(newCycleStart)}.`;
	if (surplusCents > 0) {
		return `${start} Necesidades y Gustos juntos dejaron S/ ${formatCents(surplusCents)} y pasaron al ahorro del espacio.`;
	}
	if (shortfallCents > 0) {
		return `${start} Se gastó S/ ${formatCents(shortfallCents)} de más, así que esta vez no pasó nada al ahorro. No se descuenta del ciclo nuevo.`;
	}
	return `No sobró ni faltó. ${start}`;
}

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
