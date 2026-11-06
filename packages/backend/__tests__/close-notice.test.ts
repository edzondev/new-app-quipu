import { expect, test } from "vitest";
import { closeNoticeText } from "../shared/close-notice";

const start = "2026-11-15";

test("leftover and Ahorro are both told, as in the design", () => {
	expect(closeNoticeText({ newCycleStart: start, carriedCents: 16_000, fundedCents: 5_000 })).toBe(
		"Empezó tu ciclo del 15 nov. Incluye S/ 160.00 que sobraron en Necesidades y Gustos. Los S/ 50.00 de Ahorro pasaron a tu fondo.",
	);
});

test("an overspend is told without promising a discount", () => {
	expect(closeNoticeText({ newCycleStart: start, carriedCents: -6_500, fundedCents: 0 })).toBe(
		"Empezó tu ciclo del 15 nov. Te pasaste por S/ 65.00 en tu ciclo anterior.",
	);
});

test("an amount of zero leaves its sentence out", () => {
	expect(closeNoticeText({ newCycleStart: start, carriedCents: 0, fundedCents: 5_000 })).toBe(
		"Empezó tu ciclo del 15 nov. Los S/ 50.00 de Ahorro pasaron a tu fondo.",
	);
	expect(closeNoticeText({ newCycleStart: start, carriedCents: 16_000, fundedCents: 0 })).toBe(
		"Empezó tu ciclo del 15 nov. Incluye S/ 160.00 que sobraron en Necesidades y Gustos.",
	);
});

test("with nothing to tell, only the new cycle is announced", () => {
	expect(closeNoticeText({ newCycleStart: start, carriedCents: 0, fundedCents: 0 })).toBe(
		"Empezó tu ciclo del 15 nov.",
	);
});

test("large amounts keep their thousands separator", () => {
	expect(
		closeNoticeText({ newCycleStart: start, carriedCents: 123_450, fundedCents: 123_456_789 }),
	).toBe(
		"Empezó tu ciclo del 15 nov. Incluye S/ 1,234.50 que sobraron en Necesidades y Gustos. Los S/ 1,234,567.89 de Ahorro pasaron a tu fondo.",
	);
});
