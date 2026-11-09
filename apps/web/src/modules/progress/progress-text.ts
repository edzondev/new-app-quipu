import { formatCents } from "@quipu/backend/shared/budget";

export const LOAD_ERROR = "No pudimos cargar tu progreso. Recarga la página.";

/** "S/ 20.00", or "−S/ 20.00" with the sign before the currency. */
export function formatMoney(cents: number) {
	return cents < 0 ? `−S/ ${formatCents(-cents)}` : `S/ ${formatCents(cents)}`;
}

/** What a closed cycle says about its margin (Necesidades + Gustos). The colour only backs the words. */
export function describeMargin(marginCents: number) {
	if (marginCents > 0) return { text: `Sobró ${formatMoney(marginCents)}`, tone: "text-success" };
	if (marginCents < 0) {
		return { text: `Te pasaste por ${formatMoney(-marginCents)}`, tone: "text-over" };
	}
	return { text: "Cerraste sin sobrante", tone: "text-muted-foreground" };
}

/** Nothing to list on a page that came back empty and has no next one. */
export function emptyMessage(isFirstPage: boolean, hidden: number) {
	if (!isFirstPage) return "No hay más ciclos con actividad.";
	return hidden > 0
		? "Aún no hay ciclos con actividad para mostrar"
		: "Aún no cierras un ciclo. Tu historial aparecerá aquí.";
}
