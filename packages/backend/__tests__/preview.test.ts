import { describe, expect, test } from "vitest";
import { getMonthlyDueDates } from "../shared/commitments";
import { getPreview, getSplitPreview } from "../shared/preview";

const SPLIT = { needs: 50, wants: 30, savings: 20 };

describe("getMonthlyDueDates", () => {
	test("lists the due dates inside the range, oldest first", () => {
		expect(
			getMonthlyDueDates({ kind: "day", day: 15 }, undefined, "2026-10-10", "2026-12-20"),
		).toEqual(["2026-10-15", "2026-11-15", "2026-12-15"]);
	});

	test("skips a due date that already passed", () => {
		expect(
			getMonthlyDueDates({ kind: "day", day: 1 }, undefined, "2026-10-10", "2026-10-31"),
		).toEqual([]);
	});

	test("counts a commitment due today", () => {
		expect(
			getMonthlyDueDates({ kind: "day", day: 15 }, undefined, "2026-10-15", "2026-10-31"),
		).toEqual(["2026-10-15"]);
	});

	test("day 31 clamps to the last day of the month", () => {
		expect(
			getMonthlyDueDates({ kind: "day", day: 31 }, undefined, "2026-02-01", "2026-02-28"),
		).toEqual(["2026-02-28"]);
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

		expect(result).toEqual({
			needsCents: 50_000,
			wantsCents: 30_000,
			savingsCents: 20_000,
			dailyCents: 1935,
		});
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
		expect(result.savingsCents).toBe(2000);
	});
});

describe("getSplitPreview", () => {
	const SPLIT_40 = { needs: 40, wants: 40, savings: 20 };
	const NONE = { needsCents: 0, wantsCents: 0, savingsCents: 0 };

	test("money reserved for a commitment stays in its envelope and lowers the daily number", () => {
		const result = getSplitPreview({
			envelopes: { needsCents: 25_000, wantsCents: 15_000, savingsCents: 10_000 },
			reserved: { ...NONE, needsCents: 5_000 },
			split: SPLIT_40,
			daysLeft: 12,
		});

		expect(result).toEqual({
			envelopes: { needsCents: 23_000, wantsCents: 18_000, savingsCents: 9_000 },
			dailyCents: 3_000,
		});
	});

	test("a negative envelope keeps its deficit and only positive free money is shared", () => {
		const result = getSplitPreview({
			envelopes: { needsCents: -5_000, wantsCents: 15_000, savingsCents: 10_000 },
			reserved: NONE,
			split: SPLIT_40,
			daysLeft: 12,
		});

		expect(result).toEqual({
			envelopes: { needsCents: 5_000, wantsCents: 10_000, savingsCents: 5_000 },
			dailyCents: 1_250,
		});
	});

	test("the daily number is zero when Necesidades plus Gustos is not positive", () => {
		const result = getSplitPreview({
			envelopes: { needsCents: -20_000, wantsCents: 15_000, savingsCents: 10_000 },
			reserved: NONE,
			split: SPLIT_40,
			daysLeft: 12,
		});

		expect(result.dailyCents).toBe(0);
	});
});
