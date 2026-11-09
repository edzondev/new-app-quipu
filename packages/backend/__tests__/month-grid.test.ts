import { describe, expect, test } from "vitest";
import { monthsOfYear, shiftMonth } from "../shared/dates";

describe("monthsOfYear", () => {
	test("gives the 12 months, short and full names, in order", () => {
		const cells = monthsOfYear(2027, "2026-11-16", "");
		expect(cells).toHaveLength(12);
		expect(cells[0]).toMatchObject({ month: "2027-01", short: "ene", label: "enero 2027" });
		expect(cells[2]).toMatchObject({ month: "2027-03", short: "mar", label: "marzo 2027" });
		expect(cells[11]).toMatchObject({ month: "2027-12", short: "dic", label: "diciembre 2027" });
	});

	test("the months before this one are past and this one is marked", () => {
		const cells = monthsOfYear(2026, "2026-11-16", "");
		expect(cells.filter((cell) => cell.past).map((cell) => cell.short)).toEqual([
			"ene",
			"feb",
			"mar",
			"abr",
			"may",
			"jun",
			"jul",
			"ago",
			"set",
			"oct",
		]);
		expect(cells.filter((cell) => cell.current).map((cell) => cell.month)).toEqual(["2026-11"]);
	});

	test("a later year has nothing past and nothing current; an earlier year is all past", () => {
		expect(monthsOfYear(2027, "2026-11-16", "").some((cell) => cell.past || cell.current)).toBe(
			false,
		);
		expect(monthsOfYear(2025, "2026-11-16", "").every((cell) => cell.past)).toBe(true);
	});

	test("only the chosen month is selected, and only in its own year", () => {
		expect(
			monthsOfYear(2027, "2026-11-16", "2027-03")
				.filter((cell) => cell.selected)
				.map((cell) => cell.month),
		).toEqual(["2027-03"]);
		expect(monthsOfYear(2026, "2026-11-16", "2027-03").some((cell) => cell.selected)).toBe(false);
	});

	test("this month is not past even on its last day", () => {
		const cell = monthsOfYear(2026, "2026-11-30", "").find((item) => item.current);
		expect(cell?.past).toBe(false);
	});
});

describe("shiftMonth", () => {
	test("moves across the year in both directions", () => {
		expect(shiftMonth("2026-11", 1)).toBe("2026-12");
		expect(shiftMonth("2026-12", 1)).toBe("2027-01");
		expect(shiftMonth("2027-01", -1)).toBe("2026-12");
		expect(shiftMonth("2026-11", 3)).toBe("2027-02");
		expect(shiftMonth("2026-11", 12)).toBe("2027-11");
		expect(shiftMonth("2026-03", -3)).toBe("2025-12");
	});
});
