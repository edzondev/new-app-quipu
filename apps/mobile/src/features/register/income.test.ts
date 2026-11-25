import { isEarlyIncomeWindow } from "@quipu/backend/shared/dates";
import type { Cadence } from "@quipu/backend/shared/plan";
import { describe, expect, it } from "vitest";
import {
	canAddEarlySalary,
	cycleChoices,
	incomeTodayLine,
	INITIAL_INCOME,
	NEW_EXTRA,
	saveLabel,
} from "./income";

describe("canAddEarlySalary", () => {
	const ask = { isNew: true, extra: null, earlyWindow: true };

	it("asks which cycle for a new «Para este ciclo» income inside the window", () => {
		expect(canAddEarlySalary(ask)).toBe(true);
	});

	it("does not ask outside the window", () => {
		expect(canAddEarlySalary({ ...ask, earlyWindow: false })).toBe(false);
	});

	it("does not ask for an Extra: it never changes cycle", () => {
		expect(canAddEarlySalary({ ...ask, extra: NEW_EXTRA })).toBe(false);
	});

	it("does not ask when editing: the cycle of a saved income does not change", () => {
		expect(canAddEarlySalary({ ...ask, isNew: false })).toBe(false);
	});

	// The window comes from the backend (`earlyWindow`); these are its real edges, ending Mon 30 nov.
	const edges: [Cadence, string, boolean][] = [
		["monthly", "2026-11-27", false],
		["monthly", "2026-11-28", true],
		["monthly", "2026-11-30", true],
		["biweekly", "2026-11-28", false],
		["biweekly", "2026-11-29", true],
		["weekly", "2026-11-29", false],
		["weekly", "2026-11-30", true],
	];
	it.each(edges)("%s cycle, %s: %s", (cadence, today, expected) => {
		const earlyWindow = isEarlyIncomeWindow(cadence, today, "2026-11-30");
		expect(canAddEarlySalary({ ...ask, earlyWindow })).toBe(expected);
	});
});

describe("saveLabel", () => {
	it("says Guardar when no cycle is asked", () => {
		expect(saveLabel(null, INITIAL_INCOME)).toBe("Guardar");
	});

	it("names the next cycle when the income is for it", () => {
		const cycles = cycleChoices("2026-11-30");
		expect(saveLabel(cycles, { extra: null, forNextCycle: true })).toBe("Guardar para diciembre");
		expect(saveLabel(cycles, { extra: null, forNextCycle: false })).toBe("Guardar");
	});

	it("a cycle that does not start on the 1st has no month to name", () => {
		const cycles = cycleChoices("2026-11-14");
		expect(saveLabel(cycles, INITIAL_INCOME)).toBe("Guardar para el próximo ciclo");
	});
});

describe("incomeTodayLine", () => {
	const home = {
		needsCents: 100_000,
		wantsCents: 50_000,
		savingsCents: 20_000,
		pendingCents: 20_000,
		daysLeft: 10,
		spentTodayCents: 0,
		leftCents: 13_000,
		split: { needs: 50, wants: 30, savings: 20 },
	};

	it("shows the day number after the income is split into the envelopes", () => {
		// S/ 1,000 → Necesidades +500, Gustos +300: free S/ 2,100 over 10 days.
		expect(incomeTodayLine(home, 100_000)).toBe("Hoy: S/ 130.00 → S/ 210.00");
	});

	it("floors the split like the backend, so the cents do not invent money", () => {
		expect(incomeTodayLine(home, 1_001)).toBe("Hoy: S/ 130.00 → S/ 130.80");
	});

	it("says nothing for an empty amount", () => {
		expect(incomeTodayLine(home, 0)).toBeNull();
	});
});
