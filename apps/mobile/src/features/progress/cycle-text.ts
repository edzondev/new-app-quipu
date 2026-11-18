import { formatPastDay } from "@quipu/backend/shared/dates";
import { wholeSoles } from "@quipu/backend/shared/budget";

export type MarginTone = "default" | "over" | "muted";

export function cycleTitle(startDate: string, endDate: string, today: string) {
	return `${formatPastDay(startDate, today)} – ${formatPastDay(endDate, today)}`;
}

export function marginText(marginCents: number): { text: string; tone: MarginTone } {
	if (marginCents > 0) return { text: `Sobró S/ ${wholeSoles(marginCents)}`, tone: "default" };
	if (marginCents < 0) {
		return { text: `Te pasaste por S/ ${wholeSoles(-marginCents)}`, tone: "over" };
	}
	return { text: "Cerraste sin sobrante", tone: "muted" };
}

export function leftText(cents: number) {
	return cents < 0
		? { text: `Exceso S/ ${wholeSoles(-cents)}`, over: true }
		: { text: `Sobró S/ ${wholeSoles(cents)}`, over: false };
}
