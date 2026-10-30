import { describe, expect, test } from "vitest";
import {
	applyIncome,
	freeAmounts,
	getDailyCents,
	reallocateFree,
	splitIncome,
	subtractAmounts,
	ZERO_AMOUNTS,
} from "../shared/budget";

const SPLIT_50_30_20 = { needs: 50, wants: 30, savings: 20 };
const SPLIT_40_40_20 = { needs: 40, wants: 40, savings: 20 };

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

describe("getDailyCents", () => {
	test("floors to the cent", () => {
		expect(getDailyCents(100, 3)).toBe(33);
	});

	test("never goes below zero and is zero with no days left", () => {
		expect(getDailyCents(-500, 10)).toBe(0);
		expect(getDailyCents(1000, 0)).toBe(0);
	});
});
