import { expect, test } from "vitest";
import { householdCloseNoticeText } from "../shared/close-notice";

const start = "2026-11-15";

test("a surplus says it went to the ahorro of the space", () => {
	expect(
		householdCloseNoticeText({ newCycleStart: start, surplusCents: 12_000, shortfallCents: 0 }),
	).toBe(
		"Empezó el ciclo del 15 nov. Necesidades y Gustos juntos dejaron S/ 120.00 y pasaron al ahorro del espacio.",
	);
});

test("a deficit is told without blame and says it is not discounted", () => {
	expect(
		householdCloseNoticeText({ newCycleStart: start, surplusCents: 0, shortfallCents: 3_550 }),
	).toBe(
		"Empezó el ciclo del 15 nov. Se gastó S/ 35.50 de más, así que esta vez no pasó nada al ahorro. No se descuenta del ciclo nuevo.",
	);
});

test("with neither, it says nothing was left or missing", () => {
	expect(
		householdCloseNoticeText({ newCycleStart: start, surplusCents: 0, shortfallCents: 0 }),
	).toBe("No sobró ni faltó. Empezó el ciclo del 15 nov.");
});
