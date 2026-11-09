import { describe, expect, test } from "vitest";
import {
	formatFullDay,
	formatLocalDate,
	formatMonthYear,
	formatWeekdayDay,
	parseLocalDate,
} from "../shared/dates";
import {
	choiceOfRule,
	dayExistsIn,
	dueDateFor,
	getMonthlyDueDates,
	getNextDueDate,
	isValidRule,
	ruleFromChoice,
	ruleText,
} from "../shared/commitments";

const day = (n: number) => ({ kind: "day" as const, day: n });
const last = { kind: "last" as const };
const before = (n: number) => ({ kind: "beforeEnd" as const, days: n });
const mid = { kind: "mid" as const };

describe("dueDateFor", () => {
	test("a fixed day 31 falls on the last day of a short month", () => {
		expect(dueDateFor(day(31), undefined, "2026-02")).toBe("2026-02-28");
		expect(dueDateFor(day(31), undefined, "2026-04")).toBe("2026-04-30");
		expect(dueDateFor(day(31), undefined, "2026-01")).toBe("2026-01-31");
	});

	test("the last day of February follows the leap year", () => {
		expect(dueDateFor(last, undefined, "2028-02")).toBe("2028-02-29");
		expect(dueDateFor(last, undefined, "2026-02")).toBe("2026-02-28");
	});

	test("3 days before the end of February", () => {
		expect(dueDateFor(before(3), undefined, "2026-02")).toBe("2026-02-25");
		expect(dueDateFor(before(3), undefined, "2028-02")).toBe("2028-02-26");
		expect(dueDateFor(before(10), undefined, "2026-11")).toBe("2026-11-20");
	});

	test("mid-month is the 15th", () => {
		expect(dueDateFor(mid, undefined, "2026-02")).toBe("2026-02-15");
	});

	test("an adjustment counts in its own month and is ignored in the others", () => {
		const adjustment = { month: "2026-11", day: 27 };
		expect(dueDateFor(day(28), adjustment, "2026-11")).toBe("2026-11-27");
		expect(dueDateFor(day(28), adjustment, "2026-12")).toBe("2026-12-28");
		expect(dueDateFor(day(28), adjustment, "2026-10")).toBe("2026-10-28");
	});
});

describe("getMonthlyDueDates with a rule", () => {
	test("the adjustment moves one month and the next month goes back to the rule", () => {
		expect(
			getMonthlyDueDates(day(28), { month: "2026-11", day: 27 }, "2026-11-01", "2026-12-31"),
		).toEqual(["2026-11-27", "2026-12-28"]);
	});

	test("a day moved before the commitment existed still counts", () => {
		expect(
			getMonthlyDueDates(day(28), { month: "2026-11", day: 5 }, "2026-11-10", "2026-11-30"),
		).toEqual(["2026-11-05"]);
		expect(getMonthlyDueDates(day(5), undefined, "2026-11-10", "2026-11-30")).toEqual([]);
	});

	test("the next due date of a monthly takes the adjustment only for its month", () => {
		const schedule = {
			frequency: "monthly" as const,
			rule: day(28),
			adjustment: { month: "2026-11", day: 27 },
		};
		expect(getNextDueDate(schedule, "2026-10-31")).toBe("2026-11-27");
		expect(getNextDueDate(schedule, "2026-11-30")).toBe("2026-12-28");
	});
});

describe("rule helpers", () => {
	test("dayExistsIn knows short months and leap years", () => {
		expect(dayExistsIn("2026-02", 28)).toBe(true);
		expect(dayExistsIn("2026-02", 29)).toBe(false);
		expect(dayExistsIn("2028-02", 29)).toBe(true);
		expect(dayExistsIn("2026-04", 31)).toBe(false);
		expect(dayExistsIn("2026-04", 0)).toBe(false);
		expect(dayExistsIn("2026-04", 1.5)).toBe(false);
	});

	test("a rule is valid inside its range only", () => {
		expect(isValidRule(day(1))).toBe(true);
		expect(isValidRule(day(31))).toBe(true);
		expect(isValidRule(day(0))).toBe(false);
		expect(isValidRule(day(32))).toBe(false);
		expect(isValidRule(before(10))).toBe(true);
		expect(isValidRule(before(11))).toBe(false);
		expect(isValidRule(before(0))).toBe(false);
		expect(isValidRule(last)).toBe(true);
		expect(isValidRule(mid)).toBe(true);
	});

	test("ruleText says each rule as the app shows it", () => {
		expect(ruleText(day(28))).toBe("el 28");
		expect(ruleText(last)).toBe("último día");
		expect(ruleText(before(3))).toBe("3 días antes del fin");
		expect(ruleText(before(1))).toBe("1 día antes del fin");
		expect(ruleText(mid)).toBe("quincena");
	});
});

describe("the Vence field", () => {
	test("a choice and its number make a rule, or nothing when the number does not fit", () => {
		expect(ruleFromChoice("day", "28")).toEqual({ kind: "day", day: 28 });
		expect(ruleFromChoice("day", "")).toBeNull();
		expect(ruleFromChoice("day", "32")).toBeNull();
		expect(ruleFromChoice("beforeEnd", "3")).toEqual({ kind: "beforeEnd", days: 3 });
		expect(ruleFromChoice("beforeEnd", "11")).toBeNull();
		expect(ruleFromChoice("last", "")).toEqual({ kind: "last" });
		expect(ruleFromChoice("mid", "ignored")).toEqual({ kind: "mid" });
	});

	test("choiceOfRule gives back what ruleFromChoice takes", () => {
		for (const rule of [day(5), last, before(7), mid]) {
			const { kind, amount } = choiceOfRule(rule);
			expect(ruleFromChoice(kind, amount)).toEqual(rule);
		}
	});
});

describe("date texts", () => {
	test("weekday and day, full day and month with year", () => {
		expect(formatWeekdayDay("2026-11-28")).toBe("sáb 28 nov");
		expect(formatFullDay("2026-11-16")).toBe("16 nov 2026");
		expect(formatMonthYear("2027-03")).toBe("marzo 2027");
	});

	test("a local date goes to the calendar and back without moving a day", () => {
		for (const date of ["2026-11-16", "2026-03-01", "2028-02-29", "2026-12-31"]) {
			expect(formatLocalDate(parseLocalDate(date))).toBe(date);
		}
	});
});
