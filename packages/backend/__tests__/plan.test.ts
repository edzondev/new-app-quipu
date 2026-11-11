import { describe, expect, test } from "vitest";
import { cycleLabel, isSamePlan, isValidSplit } from "../shared/plan";

describe("cycleLabel", () => {
	test("monthly and biweekly say the day of the month", () => {
		expect(cycleLabel({ cadence: "monthly", cycleStartDay: 15 })).toBe(
			"Cada mes · empieza el día 15",
		);
		expect(cycleLabel({ cadence: "biweekly", cycleStartDay: 1 })).toBe(
			"Cada quincena · empieza el día 1",
		);
	});

	test("the last day of the month is named, not shown as a number", () => {
		expect(cycleLabel({ cadence: "monthly", cycleStartDay: "last" })).toBe(
			"Cada mes · empieza el último día del mes",
		);
	});

	test("weekly names the weekday, not a day number", () => {
		expect(cycleLabel({ cadence: "weekly", cycleStartDay: 1 })).toBe(
			"Cada semana · empieza el lunes",
		);
		expect(cycleLabel({ cadence: "weekly", cycleStartDay: 0 })).toBe(
			"Cada semana · empieza el domingo",
		);
		expect(cycleLabel({ cadence: "weekly", cycleStartDay: 3 })).toBe(
			"Cada semana · empieza el miércoles",
		);
	});
});

describe("isSamePlan", () => {
	const PLAN = { cadence: "monthly" as const, cycleStartDay: 1, incomeCents: 150_000 };

	test("equal in all three fields", () => {
		expect(isSamePlan(PLAN, { ...PLAN })).toBe(true);
	});

	test("any field that differs makes it a different plan", () => {
		expect(isSamePlan(PLAN, { ...PLAN, cadence: "weekly" })).toBe(false);
		expect(isSamePlan(PLAN, { ...PLAN, cycleStartDay: "last" })).toBe(false);
		expect(isSamePlan(PLAN, { ...PLAN, incomeCents: 160_000 })).toBe(false);
	});
});

describe("isValidSplit", () => {
	test.each([
		[{ needs: 50, wants: 30, savings: 20 }, true],
		[{ needs: 100, wants: 0, savings: 0 }, true],
		[{ needs: 33.33, wants: 33.33, savings: 33.34 }, true],
		[{ needs: 0.1, wants: 0.2, savings: 99.7 }, true],
		[{ needs: 33.33, wants: 33.33, savings: 33.33 }, false],
		[{ needs: 50, wants: 30, savings: 21 }, false],
		[{ needs: 60, wants: 60, savings: -20 }, false],
		[{ needs: 101, wants: -1, savings: 0 }, false],
		[{ needs: Number.NaN, wants: 50, savings: 50 }, false],
		[{ needs: Number.POSITIVE_INFINITY, wants: 0, savings: 0 }, false],
		[{ needs: Number.NEGATIVE_INFINITY, wants: 100, savings: 0 }, false],
	])("%o → %s", (split, valid) => {
		expect(isValidSplit(split)).toBe(valid);
	});
});
