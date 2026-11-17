import { formatDay } from "@quipu/backend/shared/dates";
import { wholeSoles } from "@/features/savings/progress";

export type MarginTone = "default" | "over" | "muted";

export function cycleTitle(startDate: string, endDate: string) {
	return `${formatDay(startDate)} – ${formatDay(endDate)}`;
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
