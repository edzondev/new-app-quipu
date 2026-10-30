import { describe, expect, test } from "vitest";
import { getMonthlyDueDates } from "../shared/commitments";
import { getPreview } from "../shared/preview";

const SPLIT = { needs: 50, wants: 30, savings: 20 };

describe("getMonthlyDueDates", () => {
	test("lists the due dates inside the range, oldest first", () => {
		expect(getMonthlyDueDates(15, "2026-10-10", "2026-12-20")).toEqual([
			"2026-10-15",
			"2026-11-15",
			"2026-12-15",
		]);
	});

	test("skips a due date that already passed", () => {
		expect(getMonthlyDueDates(1, "2026-10-10", "2026-10-31")).toEqual([]);
	});

	test("counts a commitment due today", () => {
		expect(getMonthlyDueDates(15, "2026-10-15", "2026-10-31")).toEqual(["2026-10-15"]);
	});

	test("day 31 clamps to the last day of the month", () => {
		expect(getMonthlyDueDates(31, "2026-02-01", "2026-02-28")).toEqual(["2026-02-28"]);
	});
});

describe("getPreview matches Inicio", () => {
	test("splits the whole income; a pending commitment only lowers the daily number", () => {
		const result = getPreview({
			incomeCents: 100_000,
			commitments: [{ amountCents: 20_000, dueDay: 15 }],
			split: SPLIT,
			cycleEnd: "2026-10-31",
			today: "2026-10-01",
		});

		expect(result).toEqual({ needs: 50_000, wants: 30_000, savings: 20_000, dailyCents: 1935 });
	});

	test("a commitment whose due day already passed this cycle does not count", () => {
		const result = getPreview({
			incomeCents: 100_000,
			commitments: [{ amountCents: 20_000, dueDay: 1 }],
			split: SPLIT,
			cycleEnd: "2026-10-31",
			today: "2026-10-10",
		});

		expect(result.dailyCents).toBe(3636);
	});

	test("a commitment due after the cycle ends does not count", () => {
		const result = getPreview({
			incomeCents: 70_000,
			commitments: [{ amountCents: 30_000, dueDay: 5 }],
			split: SPLIT,
			cycleEnd: "2026-10-31",
			today: "2026-10-29",
		});

		expect(result.dailyCents).toBe(18_666);
	});

	test("a commitment due today counts and today counts as a day left", () => {
		const result = getPreview({
			incomeCents: 100_000,
			commitments: [{ amountCents: 10_000, dueDay: 15 }],
			split: SPLIT,
			cycleEnd: "2026-10-31",
			today: "2026-10-15",
		});

		expect(result.dailyCents).toBe(4117);
	});

	test("the daily number never goes below zero and Savings is untouched", () => {
		const result = getPreview({
			incomeCents: 10_000,
			commitments: [{ amountCents: 50_000, dueDay: 15 }],
			split: SPLIT,
			cycleEnd: "2026-10-31",
			today: "2026-10-01",
		});

		expect(result.dailyCents).toBe(0);
		expect(result.savings).toBe(2000);
	});
});
