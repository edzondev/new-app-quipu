import { describe, expect, test } from "vitest";
import {
	dayInMonth,
	formatDayHeading,
	formatDaysLeft,
	formatPastDay,
	formatRecentDay,
	isEarlyIncomeWindow,
	monthName,
	getCycleRange,
	getFirstCycleRange,
	getLimaDate,
} from "../shared/dates";

describe("formatDayHeading", () => {
	test("today and yesterday are named, other days start with the weekday", () => {
		expect(formatDayHeading("2026-10-30", "2026-10-30")).toBe("Hoy · vie 30 oct");
		expect(formatDayHeading("2026-10-29", "2026-10-30")).toBe("Ayer · jue 29 oct");
		expect(formatDayHeading("2026-10-27", "2026-10-30")).toBe("Mar 27 oct");
	});

	test("yesterday crosses a month boundary", () => {
		expect(formatDayHeading("2026-10-31", "2026-11-01")).toBe("Ayer · sáb 31 oct");
	});
});

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

describe("getLimaDate", () => {
	test("23:59 and 00:01 in Lima are different calendar days", () => {
		// Lima is UTC−5. These instants are the same UTC calendar day.
		expect(getLimaDate(new Date("2026-03-16T04:59:00.000Z"))).toBe("2026-03-15");
		expect(getLimaDate(new Date("2026-03-16T05:01:00.000Z"))).toBe("2026-03-16");
	});
});

describe("getFirstCycleRange", () => {
	test("from Oct 20 with payday day 1 ends Oct 31 (short first cycle)", () => {
		expect(getFirstCycleRange("monthly", 1, "2026-10-20")).toEqual({
			startDate: "2026-10-20",
			endDate: "2026-10-31",
		});
	});

	// Payday == today uses `>` (not `>=`) on dates.ts startMonth so the cycle starts today.
	test("payday today → full cycle from today", () => {
		expect(getFirstCycleRange("monthly", 1, "2026-10-01")).toEqual({
			startDate: "2026-10-01",
			endDate: "2026-10-31",
		});
	});

	test("payday tomorrow → one-day cycle", () => {
		expect(getFirstCycleRange("monthly", 21, "2026-10-20")).toEqual({
			startDate: "2026-10-20",
			endDate: "2026-10-20",
		});
	});

	test("monthly day 31 clamps in February", () => {
		expect(getFirstCycleRange("monthly", 31, "2026-02-10")).toEqual({
			startDate: "2026-02-10",
			endDate: "2026-02-27",
		});
	});

	test("biweekly payday today → full first half", () => {
		expect(getFirstCycleRange("biweekly", 1, "2026-10-01")).toEqual({
			startDate: "2026-10-01",
			endDate: "2026-10-15",
		});
	});

	test("biweekly second half short first cycle", () => {
		expect(getFirstCycleRange("biweekly", 1, "2026-10-20")).toEqual({
			startDate: "2026-10-20",
			endDate: "2026-10-31",
		});
	});

	test("weekly payday today → full week", () => {
		// 2026-10-25 is Sunday.
		expect(getFirstCycleRange("weekly", 0, "2026-10-25")).toEqual({
			startDate: "2026-10-25",
			endDate: "2026-10-31",
		});
	});

	test("weekly mid-week → short first cycle", () => {
		expect(getFirstCycleRange("weekly", 0, "2026-10-28")).toEqual({
			startDate: "2026-10-28",
			endDate: "2026-10-31",
		});
	});
});

describe("formatDaysLeft", () => {
	test("the last day is singular, the rest are plural", () => {
		expect(formatDaysLeft(16)).toBe("quedan 16 días");
		expect(formatDaysLeft(1)).toBe("queda 1 día");
		expect(formatDaysLeft(0)).toBe("quedan 0 días");
	});
});

describe("formatRecentDay", () => {
	test("today and yesterday are named, the rest of the week by weekday, older by date", () => {
		expect(formatRecentDay("2026-10-30", "2026-10-30")).toBe("hoy");
		expect(formatRecentDay("2026-10-29", "2026-10-30")).toBe("ayer");
		expect(formatRecentDay("2026-10-26", "2026-10-30")).toBe("lun");
		expect(formatRecentDay("2026-10-23", "2026-10-30")).toBe("23 oct");
	});

	test("a future date reads as today", () => {
		expect(formatRecentDay("2026-10-31", "2026-10-30")).toBe("hoy");
	});

	test("a date from another year carries the year", () => {
		expect(formatRecentDay("2026-12-20", "2027-01-05")).toBe("20 dic 2026");
	});
});

describe("formatPastDay", () => {
	test("a day of this year has no year", () => {
		expect(formatPastDay("2026-07-22", "2026-10-30")).toBe("22 jul");
	});

	test("a day of another year carries it", () => {
		expect(formatPastDay("2026-12-31", "2027-01-02")).toBe("31 dic 2026");
	});
});

describe("isEarlyIncomeWindow", () => {
	test("monthly counts the last 3 days, today included", () => {
		expect(isEarlyIncomeWindow("monthly", "2026-10-28", "2026-10-31")).toBe(false);
		expect(isEarlyIncomeWindow("monthly", "2026-10-29", "2026-10-31")).toBe(true);
		expect(isEarlyIncomeWindow("monthly", "2026-10-31", "2026-10-31")).toBe(true);
	});

	test("biweekly counts the last 2 days", () => {
		expect(isEarlyIncomeWindow("biweekly", "2026-10-29", "2026-10-31")).toBe(false);
		expect(isEarlyIncomeWindow("biweekly", "2026-10-30", "2026-10-31")).toBe(true);
	});

	test("weekly counts only the last day", () => {
		expect(isEarlyIncomeWindow("weekly", "2026-10-30", "2026-10-31")).toBe(false);
		expect(isEarlyIncomeWindow("weekly", "2026-10-31", "2026-10-31")).toBe(true);
	});
});

test("monthName gives the full lowercase month", () => {
	expect(monthName("2026-11-01")).toBe("noviembre");
});
