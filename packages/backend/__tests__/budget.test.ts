import { describe, expect, test } from "vitest";
import {
	applyIncome,
	freeAmounts,
	getDailyBudget,
	reallocateFree,
	splitIncome,
	subtractAmounts,
	toCents,
	ZERO_AMOUNTS,
} from "../shared/budget";

const SPLIT_50_30_20 = { needs: 50, wants: 30, savings: 20 };
const SPLIT_40_40_20 = { needs: 40, wants: 40, savings: 20 };

describe("toCents", () => {
	test("a comma with one or two trailing digits is the decimal mark", () => {
		expect(toCents("12,50")).toBe(1250);
		expect(toCents("12,5")).toBe(1250);
		expect(toCents("12.50")).toBe(1250);
		expect(toCents("12.5")).toBe(1250);
		expect(toCents("19.99")).toBe(1999);
	});

	test("any other comma groups thousands", () => {
		expect(toCents("1,500")).toBe(150_000);
	});
});

describe("splitIncome", () => {
	test("S/ 10.01 at 50/30/20 gives 5.01, 3.00 and 2.00", () => {
		expect(splitIncome(1001, SPLIT_50_30_20)).toEqual({
			needsCents: 501,
			wantsCents: 300,
			savingsCents: 200,
		});
	});

	test("parts always sum to the income", () => {
		for (const cents of [1, 99, 100, 333, 1000, 10_001]) {
			const share = splitIncome(cents, SPLIT_50_30_20);
			expect(share.needsCents + share.wantsCents + share.savingsCents).toBe(cents);
		}
	});

	// Onboarding's split step shows splitIncome; applyIncome stores the same object.
	test("what the split step shows is what applyIncome stores", () => {
		const incomeCents = 10_003;
		const shown = splitIncome(incomeCents, SPLIT_50_30_20);
		const stored = applyIncome(ZERO_AMOUNTS, incomeCents, SPLIT_50_30_20).allocation;

		expect(shown).toEqual({ needsCents: 5003, wantsCents: 3000, savingsCents: 2000 });
		expect(stored).toEqual(shown);
		expect([
			Math.round((incomeCents * 50) / 100),
			Math.round((incomeCents * 30) / 100),
			Math.round((incomeCents * 20) / 100),
		]).not.toEqual([shown.needsCents, shown.wantsCents, shown.savingsCents]);
	});
});

describe("applyIncome", () => {
	test("free Wants already there stays; the income only adds its own share", () => {
		const envelopes = { needsCents: 500, wantsCents: 200, savingsCents: 100 };
		const spent = { needsCents: 0, wantsCents: 50, savingsCents: 0 };
		expect(freeAmounts(envelopes, spent, ZERO_AMOUNTS).wantsCents).toBe(150);

		const result = applyIncome(envelopes, 1000, SPLIT_50_30_20);

		expect(result.allocation).toEqual({ needsCents: 500, wantsCents: 300, savingsCents: 200 });
		expect(freeAmounts(result.envelopes, spent, ZERO_AMOUNTS)).toEqual({
			needsCents: 1000,
			wantsCents: 450,
			savingsCents: 300,
		});
	});

	test("deleting an income restores envelopes to how they were before that income", () => {
		const before = { needsCents: 100, wantsCents: 50, savingsCents: 25 };
		const { envelopes, allocation } = applyIncome(before, 1000, SPLIT_50_30_20);

		expect(envelopes).toEqual({ needsCents: 600, wantsCents: 350, savingsCents: 225 });
		expect(subtractAmounts(envelopes, allocation)).toEqual(before);
	});

	test("deleting an income after a split change subtracts its original allocation", () => {
		const first = applyIncome(ZERO_AMOUNTS, 1001, SPLIT_50_30_20);
		const second = applyIncome(first.envelopes, 1000, SPLIT_50_30_20);
		expect(second.envelopes).toEqual({ needsCents: 1001, wantsCents: 600, savingsCents: 400 });

		const afterSplit = reallocateFree(second.envelopes, ZERO_AMOUNTS, ZERO_AMOUNTS, SPLIT_40_40_20);
		expect(afterSplit).toEqual({ needsCents: 801, wantsCents: 800, savingsCents: 400 });

		const afterDelete = subtractAmounts(afterSplit, first.allocation);

		expect(afterDelete).toEqual({ needsCents: 300, wantsCents: 500, savingsCents: 200 });
		expect(afterDelete).not.toEqual(subtractAmounts(afterSplit, splitIncome(1001, SPLIT_40_40_20)));
	});
});

describe("reallocateFree", () => {
	test("spent and reserved money keeps its envelope; only the free pool is redistributed", () => {
		const envelopes = { needsCents: 500, wantsCents: 300, savingsCents: 200 };
		const spent = { needsCents: 0, wantsCents: 100, savingsCents: 0 };
		const reserved = { needsCents: 50, wantsCents: 0, savingsCents: 0 };

		const result = reallocateFree(envelopes, spent, reserved, SPLIT_50_30_20);

		expect(result).toEqual({ needsCents: 475, wantsCents: 355, savingsCents: 170 });
		expect(result.needsCents + result.wantsCents + result.savingsCents).toBe(1000);
	});

	test("a negative free envelope keeps its deficit and only the positive free money is shared", () => {
		// Free: needs -50, wants +200, savings +100. Positive pool 300 at 40/40/20 = 120/120/60.
		const envelopes = { needsCents: 450, wantsCents: 200, savingsCents: 100 };
		const spent = { needsCents: 500, wantsCents: 0, savingsCents: 0 };

		const result = reallocateFree(envelopes, spent, ZERO_AMOUNTS, SPLIT_40_40_20);

		expect(freeAmounts(result, spent, ZERO_AMOUNTS)).toEqual({
			needsCents: 70,
			wantsCents: 120,
			savingsCents: 60,
		});
	});
});

describe("getDailyBudget", () => {
	test("floors to the cent", () => {
		expect(getDailyBudget({ freeCents: 100, spentTodayCents: 0, daysLeft: 3 })).toMatchObject({
			baseCents: 33,
			leftCents: 33,
		});
	});

	test("the base holds still while you spend and each expense comes off it", () => {
		// 554.40 free at dawn with 3 days left: 184.80 a day.
		const day = (spentTodayCents: number) =>
			getDailyBudget({ freeCents: 55_440 - spentTodayCents, spentTodayCents, daysLeft: 3 });

		expect(day(0)).toEqual({
			baseCents: 18_480,
			leftCents: 18_480,
			overCents: 0,
			tomorrowCents: 27_720,
		});
		// After S/ 184.00: S/ 0.80 left of S/ 184.80.
		expect(day(18_400)).toMatchObject({ baseCents: 18_480, leftCents: 80, overCents: 0 });
		// After S/ 197.20: S/ 12.40 over; the 357.20 left are shared by the 2 days still to come.
		expect(day(19_720)).toEqual({
			baseCents: 18_480,
			leftCents: 0,
			overCents: 1_240,
			tomorrowCents: 17_860,
		});
	});

	test("an income today raises the base at once", () => {
		// Spent 184.00 and then S/ 30.00 came in: the base goes from 184.80 to 194.80.
		const before = getDailyBudget({ freeCents: 37_040, spentTodayCents: 18_400, daysLeft: 3 });
		const after = getDailyBudget({ freeCents: 40_040, spentTodayCents: 18_400, daysLeft: 3 });

		expect(before.baseCents).toBe(18_480);
		expect(after).toMatchObject({ baseCents: 19_480, leftCents: 1_080 });
	});

	test("the last day has no tomorrow", () => {
		const result = getDailyBudget({ freeCents: -1_240, spentTodayCents: 6_200, daysLeft: 1 });

		expect(result).toEqual({
			baseCents: 4_960,
			leftCents: 0,
			overCents: 1_240,
			tomorrowCents: null,
		});
	});

	test("a negative free amount gives base 0 and tomorrow 0, never a negative number", () => {
		expect(getDailyBudget({ freeCents: -500, spentTodayCents: 0, daysLeft: 10 })).toEqual({
			baseCents: 0,
			leftCents: 0,
			overCents: 0,
			tomorrowCents: 0,
		});
	});

	test("the base comes from what was free when the day began, even if free went negative", () => {
		// Free −5.00 after spending 20.00: it was 15.00 at dawn, over 3 days.
		expect(getDailyBudget({ freeCents: -500, spentTodayCents: 2_000, daysLeft: 3 })).toEqual({
			baseCents: 500,
			leftCents: 0,
			overCents: 1_500,
			tomorrowCents: 0,
		});
		// Free −30.00 after spending 20.00: nothing was free at dawn.
		expect(
			getDailyBudget({ freeCents: -3_000, spentTodayCents: 2_000, daysLeft: 3 }),
		).toMatchObject({ baseCents: 0, overCents: 2_000 });
	});

	test("is zero with no days left", () => {
		expect(getDailyBudget({ freeCents: 1_000, spentTodayCents: 0, daysLeft: 0 })).toMatchObject({
			baseCents: 0,
			tomorrowCents: null,
		});
	});
});
