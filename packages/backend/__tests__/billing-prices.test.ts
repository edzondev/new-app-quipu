import { describe, expect, test } from "vitest";
import { annualSavings, monthlyEquivalent, planPrices } from "../shared/billing";
import { formatCents } from "../shared/budget";

const offer = (productId: string, interval: "month" | "year", prices: [string, number][]) => ({
	productId,
	interval,
	prices: prices.map(([currency, amountCents]) => ({ currency, amountCents })),
});

describe("paywall prices", () => {
	test("S/ 12.90 a month and S/ 89.90 a year save S/ 64.90, about S/ 7.49 a month", () => {
		const prices = planPrices([
			offer("prod_month", "month", [["pen", 1290]]),
			offer("prod_year", "year", [["pen", 8990]]),
		]);
		expect(prices).toEqual({ month: 1290, year: 8990 });
		expect(formatCents(annualSavings(prices) ?? 0)).toBe("64.90");
		expect(formatCents(monthlyEquivalent(8990))).toBe("7.49");
	});

	test("other prices change the savings and the equivalent", () => {
		const prices = planPrices([
			offer("prod_month", "month", [["pen", 1490]]),
			offer("prod_year", "year", [["pen", 11990]]),
		]);
		expect(annualSavings(prices)).toBe(5890);
		expect(monthlyEquivalent(11990)).toBe(999);
	});

	test("the equivalent rounds to the nearest cent", () => {
		expect(monthlyEquivalent(10006)).toBe(834);
		expect(monthlyEquivalent(10002)).toBe(834);
		expect(monthlyEquivalent(10001)).toBe(833);
	});

	test("no savings when the year is not cheaper than twelve months", () => {
		expect(annualSavings({ month: 1000, year: 12000 })).toBeNull();
		expect(annualSavings({ month: 1000, year: 13000 })).toBeNull();
	});

	test("without a PEN price that plan has no price, and there are no savings", () => {
		const prices = planPrices([
			offer("prod_month", "month", [["usd", 399]]),
			offer("prod_year", "year", [["pen", 8990]]),
		]);
		expect(prices).toEqual({ month: null, year: 8990 });
		expect(annualSavings(prices)).toBeNull();
		expect(planPrices([])).toEqual({ month: null, year: null });
	});

	test("an offer priced in several currencies shows its price in soles", () => {
		const prices = planPrices([
			offer("prod_year", "year", [
				["usd", 2999],
				["pen", 8990],
			]),
		]);
		expect(prices.year).toBe(8990);
	});
});
