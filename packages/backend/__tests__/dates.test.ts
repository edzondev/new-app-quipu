import { describe, expect, test } from "vitest";
import {
	dayInMonth,
	formatDayHeading,
	formatDaysLeft,
	formatLimaTime,
	formatPastDay,
	formatRangeWithYear,
	formatRecentDay,
	isEarlyIncomeWindow,
	monthName,
	getCycleRange,
	getFirstCycleRange,
	getLimaDate,
	getNextCycleRange,
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

describe("formatRangeWithYear", () => {
	test("inside one year the year is written once, at the end", () => {
		expect(formatRangeWithYear("2026-09-01", "2026-09-30")).toBe("1 set → 30 set 2026");
	});

	test("across two years each end carries its own", () => {
		expect(formatRangeWithYear("2026-12-15", "2027-01-14")).toBe("15 dic 2026 → 14 ene 2027");
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

describe("getNextCycleRange", () => {
	test("a normal period starts and ends where the plan says", () => {
		expect(getNextCycleRange("monthly", 1, "2026-12-01")).toEqual({
			startDate: "2026-12-01",
			endDate: "2026-12-31",
		});
	});

	test("monthly: 14 days join the next period, 15 do not", () => {
		// Start day 15: 1–14 Nov is 14 days.
		expect(getNextCycleRange("monthly", 15, "2026-11-01")).toEqual({
			startDate: "2026-11-01",
			endDate: "2026-12-14",
		});
		// Start day 16: 1–15 Nov is 15 days.
		expect(getNextCycleRange("monthly", 16, "2026-11-01")).toEqual({
			startDate: "2026-11-01",
			endDate: "2026-11-15",
		});
	});

	test("biweekly: 6 days join the next half, 7 do not", () => {
		// Start day 7: the second half ends 6 Nov, so 1–6 Nov is 6 days.
		expect(getNextCycleRange("biweekly", 7, "2026-11-01")).toEqual({
			startDate: "2026-11-01",
			endDate: "2026-11-21",
		});
		// Start day 8: 1–7 Nov is 7 days.
		expect(getNextCycleRange("biweekly", 8, "2026-11-01")).toEqual({
			startDate: "2026-11-01",
			endDate: "2026-11-07",
		});
	});

	test("weekly: 3 days join the next week, 4 do not", () => {
		// 1 Nov 2026 is a Sunday. Weeks starting Wednesday end on Tuesday 3 Nov: 3 days.
		expect(getNextCycleRange("weekly", 3, "2026-11-01")).toEqual({
			startDate: "2026-11-01",
			endDate: "2026-11-10",
		});
		// Weeks starting Thursday end on Wednesday 4 Nov: 4 days.
		expect(getNextCycleRange("weekly", 4, "2026-11-01")).toEqual({
			startDate: "2026-11-01",
			endDate: "2026-11-04",
		});
	});
});

test("formatLimaTime shows the hour in Lima, not in UTC", () => {
	expect(formatLimaTime(Date.parse("2026-11-09T15:42:00.000Z"))).toBe("10:42");
	expect(formatLimaTime(Date.parse("2026-11-10T04:05:00.000Z"))).toBe("23:05");
});
