import { formatCents } from "@quipu/backend/shared/budget";

/** "S/ 20.00", or "−S/ 20.00" with the sign before the currency. */
export function formatMoney(cents: number) {
	return cents < 0 ? `−S/ ${formatCents(-cents)}` : `S/ ${formatCents(cents)}`;
}

export const loadError = (together: boolean) =>
	`No pudimos cargar ${together ? "su" : "tu"} progreso. Recarga la página.`;

export function describeMargin(marginCents: number, together: boolean) {
	if (marginCents > 0) {
		const text = `Sobró ${formatMoney(marginCents)}${together ? " · pasó a Ahorro" : ""}`;
		return { text, tone: "text-success" };
	}
	if (marginCents < 0) {
		const text = `${together ? "Se pasaron" : "Te pasaste"} por ${formatMoney(-marginCents)}`;
		return { text, tone: "text-over" };
	}
	return {
		text: together ? "Cerraron sin sobrante" : "Cerraste sin sobrante",
		tone: "text-muted-foreground",
	};
}

/** Nothing to list on a page that came back empty and has no next one. */
export function emptyMessage(isFirstPage: boolean, hidden: number, together: boolean) {
	if (!isFirstPage) return "No hay más ciclos con actividad.";
	if (hidden > 0) return "Aún no hay ciclos con actividad para mostrar";
	return together
		? "Aún no cierran un ciclo. Su historial aparecerá aquí."
		: "Aún no cierras un ciclo. Tu historial aparecerá aquí.";
}
