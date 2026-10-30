import { describe, expect, test } from "vitest";
import { dayInMonth, getCycleRange } from "../shared/dates";

describe("getCycleRange", () => {
	test("monthly from day 1", () => {
		expect(getCycleRange("monthly", 1, "2026-10-15")).toEqual({
			startDate: "2026-10-01",
			endDate: "2026-10-31",
		});
	});

	test("monthly day 31 clamps in February", () => {
		expect(getCycleRange("monthly", 31, "2026-02-10")).toEqual({
			startDate: "2026-01-31",
			endDate: "2026-02-27",
		});
	});

	test("monthly last day across year boundary", () => {
		expect(getCycleRange("monthly", "last", "2027-01-05")).toEqual({
			startDate: "2026-12-31",
			endDate: "2027-01-30",
		});
	});

	test("biweekly first half", () => {
		expect(getCycleRange("biweekly", 1, "2026-10-10")).toEqual({
			startDate: "2026-10-01",
			endDate: "2026-10-15",
		});
	});

	test("biweekly second half", () => {
		expect(getCycleRange("biweekly", 1, "2026-10-20")).toEqual({
			startDate: "2026-10-16",
			endDate: "2026-10-31",
		});
	});

	test("weekly Sunday start", () => {
		expect(getCycleRange("weekly", 0, "2026-10-29")).toEqual({
			startDate: "2026-10-25",
			endDate: "2026-10-31",
		});
	});
});

describe("dayInMonth", () => {
	test("last day of February non-leap", () => {
		expect(dayInMonth(2026, 1, "last")).toBe("2026-02-28");
	});

	test("day 31 clamps in April", () => {
		expect(dayInMonth(2026, 3, 31)).toBe("2026-04-30");
	});
});
