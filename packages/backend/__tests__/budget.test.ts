import { describe, expect, test } from "vitest";
import {
	applyIncome,
	type EnvelopeAmounts,
	freeAmounts,
	getDailyCents,
	reallocateFree,
	splitIncome,
	subtractAmounts,
} from "../shared/budget";

const SPLIT_50_30_20 = { needs: 50, wants: 30, savings: 20 };
const SPLIT_40_40_20 = { needs: 40, wants: 40, savings: 20 };
const ZERO: EnvelopeAmounts = { needs: 0, wants: 0, savings: 0 };

describe("splitIncome", () => {
	test("S/ 10.01 at 50/30/20 gives 5.01, 3.00 and 2.00", () => {
		expect(splitIncome(1001, SPLIT_50_30_20)).toEqual({ needs: 501, wants: 300, savings: 200 });
	});

	test("parts always sum to the income", () => {
		for (const cents of [1, 99, 100, 333, 1000, 10_001]) {
			const share = splitIncome(cents, SPLIT_50_30_20);
			expect(share.needs + share.wants + share.savings).toBe(cents);
		}
	});

	// Onboarding's split step shows splitIncome(...).key; applyIncome stores the same object.
	test("what the split step shows is what applyIncome stores", () => {
		const incomeCents = 10_003;
		const shown = splitIncome(incomeCents, SPLIT_50_30_20);
		const stored = applyIncome(ZERO, incomeCents, SPLIT_50_30_20).allocation;

		expect(shown).toEqual({ needs: 5003, wants: 3000, savings: 2000 });
		expect(stored).toEqual(shown);
		expect([
			Math.round((incomeCents * 50) / 100),
			Math.round((incomeCents * 30) / 100),
			Math.round((incomeCents * 20) / 100),
		]).not.toEqual([shown.needs, shown.wants, shown.savings]);
	});
});

describe("applyIncome", () => {
	test("free Wants already there stays; the income only adds its own share", () => {
		const envelopes = { needs: 500, wants: 200, savings: 100 };
		const spent = { needs: 0, wants: 50, savings: 0 };
		expect(freeAmounts(envelopes, spent, ZERO).wants).toBe(150);

		const result = applyIncome(envelopes, 1000, SPLIT_50_30_20);

		expect(result.allocation).toEqual({ needs: 500, wants: 300, savings: 200 });
		expect(freeAmounts(result.envelopes, spent, ZERO)).toEqual({
			needs: 1000,
			wants: 450,
			savings: 300,
		});
	});

	test("deleting an income after a split change subtracts its original allocation", () => {
		const first = applyIncome(ZERO, 1001, SPLIT_50_30_20);
		const second = applyIncome(first.envelopes, 1000, SPLIT_50_30_20);
		expect(second.envelopes).toEqual({ needs: 1001, wants: 600, savings: 400 });

		const afterSplit = reallocateFree(second.envelopes, ZERO, ZERO, SPLIT_40_40_20);
		expect(afterSplit).toEqual({ needs: 801, wants: 800, savings: 400 });

		const afterDelete = subtractAmounts(afterSplit, first.allocation);

		expect(afterDelete).toEqual({ needs: 300, wants: 500, savings: 200 });
		expect(afterDelete).not.toEqual(subtractAmounts(afterSplit, splitIncome(1001, SPLIT_40_40_20)));
	});
});

describe("reallocateFree", () => {
	test("spent and reserved money keeps its envelope; only the free pool is redistributed", () => {
		const envelopes = { needs: 500, wants: 300, savings: 200 };
		const spent = { needs: 0, wants: 100, savings: 0 };
		const reserved = { needs: 50, wants: 0, savings: 0 };

		const result = reallocateFree(envelopes, spent, reserved, SPLIT_50_30_20);

		expect(result).toEqual({ needs: 475, wants: 355, savings: 170 });
		expect(result.needs + result.wants + result.savings).toBe(1000);
	});

	test("a negative free envelope keeps its deficit and only the positive free money is shared", () => {
		// Free: needs -50, wants +200, savings +100. Positive pool 300 at 40/40/20 = 120/120/60.
		const envelopes = { needs: 450, wants: 200, savings: 100 };
		const spent = { needs: 500, wants: 0, savings: 0 };

		const result = reallocateFree(envelopes, spent, ZERO, SPLIT_40_40_20);

		expect(freeAmounts(result, spent, ZERO)).toEqual({ needs: 70, wants: 120, savings: 60 });
	});
});

describe("getDailyCents", () => {
	test("floors to the cent", () => {
		expect(getDailyCents(100, 3)).toBe(33);
	});

	test("never goes below zero and is zero with no days left", () => {
		expect(getDailyCents(-500, 10)).toBe(0);
		expect(getDailyCents(1000, 0)).toBe(0);
	});
});
