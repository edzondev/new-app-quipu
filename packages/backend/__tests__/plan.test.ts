import { describe, expect, test } from "vitest";
import { cycleLabel, isSamePlan } from "../shared/plan";

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
