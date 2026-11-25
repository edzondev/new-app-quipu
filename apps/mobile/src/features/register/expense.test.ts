import { describe, expect, it } from "vitest";
import {
	canSaveAmount,
	contributionTodayLine,
	envelopeBalanceCents,
	expenseTodayLine,
	todayLine,
} from "./expense";

// Free S/ 1,300 = 1,000 + 500 − 200 over 10 days: the day's base is S/ 130.00.
const home = {
	needsCents: 100_000,
	wantsCents: 50_000,
	pendingCents: 20_000,
	daysLeft: 10,
	spentTodayCents: 0,
	leftCents: 13_000,
};
// The same day after spending S/ 15.00: the base stays S/ 130.00 and S/ 115.00 is left.
const afterSpending = {
	...home,
	needsCents: 98_500,
	spentTodayCents: 1_500,
	leftCents: 11_500,
};
const fresh = { originalCents: 0, countsToday: true };

describe("expenseTodayLine", () => {
	it("shows what is left today before and after the expense", () => {
		expect(expenseTodayLine(home, { ...fresh, amountCents: 1_500 })).toBe(
			"Hoy: S/ 130.00 → S/ 115.00",
		);
	});

	it("keeps the cents", () => {
		expect(expenseTodayLine(home, { ...fresh, amountCents: 1_234 })).toBe(
			"Hoy: S/ 130.00 → S/ 117.66",
		);
	});

	it("says there is nothing left, not that you go over, when the expense is exactly the day", () => {
		expect(expenseTodayLine(home, { ...fresh, amountCents: 13_000 })).toBe(
			"Hoy: S/ 130.00 → S/ 0.00",
		);
	});

	it("says you go over from the first cent past the day", () => {
		expect(expenseTodayLine(home, { ...fresh, amountCents: 13_001 })).toBe(
			"Hoy te pasarás S/ 0.01",
		);
		expect(expenseTodayLine(home, { ...fresh, amountCents: 20_000 })).toBe(
			"Hoy te pasarás S/ 70.00",
		);
	});

	it("says nothing for an empty or negative amount", () => {
		expect(expenseTodayLine(home, { ...fresh, amountCents: 0 })).toBeNull();
		expect(expenseTodayLine(home, { ...fresh, amountCents: -100 })).toBeNull();
	});

	it("an edited expense today only changes the difference", () => {
		const change = { amountCents: 3_000, originalCents: 1_500, countsToday: true };
		expect(expenseTodayLine(afterSpending, change)).toBe("Hoy: S/ 115.00 → S/ 100.00");
	});

	it("an edited expense can give money back", () => {
		const change = { amountCents: 500, originalCents: 1_500, countsToday: true };
		expect(expenseTodayLine(afterSpending, change)).toBe("Hoy: S/ 115.00 → S/ 125.00");
	});

	it("an expense from an earlier day moves the free money but not what was spent today", () => {
		// S/ 128.50 left (free S/ 1,285 over 10 days); the old expense goes from S/ 15 to S/ 30.
		const older = { ...home, needsCents: 98_500, leftCents: 12_850 };
		const change = { amountCents: 3_000, originalCents: 1_500, countsToday: false };
		expect(expenseTodayLine(older, change)).toBe("Hoy: S/ 128.50 → S/ 127.00");
		// Counting it as spent today would have given S/ 113.50.
		expect(expenseTodayLine(older, { ...change, countsToday: true })).toBe(
			"Hoy: S/ 128.50 → S/ 113.50",
		);
	});

	it("the last day of the cycle has no tomorrow: the whole free money is the day", () => {
		const lastDay = { ...home, daysLeft: 1, leftCents: 130_000 };
		expect(expenseTodayLine(lastDay, { ...fresh, amountCents: 130_001 })).toBe(
			"Hoy te pasarás S/ 0.01",
		);
	});
});

describe("contributionTodayLine", () => {
	const aporte = { originalCents: 0, countsToday: false };

	it("shows the day number in Personal after the aporte", () => {
		expect(contributionTodayLine(home, { ...aporte, amountCents: 1_300 })).toBe(
			"Hoy en Personal: S/ 130.00 → S/ 128.70",
		);
	});

	it("never says you go over: an aporte is not spending", () => {
		expect(contributionTodayLine(home, { ...aporte, amountCents: 500_000 })).toBe(
			"Hoy en Personal: S/ 130.00 → S/ 0.00",
		);
	});

	it("says nothing for an empty amount", () => {
		expect(contributionTodayLine(home, { ...aporte, amountCents: 0 })).toBeNull();
	});
});

describe("todayLine", () => {
	it("formats both sides with thousands and cents", () => {
		expect(todayLine(123_456, 7_000)).toBe("Hoy: S/ 1,234.56 → S/ 70.00");
	});
});

describe("canSaveAmount", () => {
	it("needs at least one cent", () => {
		expect(canSaveAmount(0)).toBe(false);
		expect(canSaveAmount(-1)).toBe(false);
		expect(canSaveAmount(1)).toBe(true);
	});

	it("stops at S/ 1,000,000 like the backend", () => {
		expect(canSaveAmount(100_000_000)).toBe(true);
		expect(canSaveAmount(100_000_001)).toBe(false);
	});
});

describe("envelopeBalanceCents", () => {
	it("shows a negative envelope as zero", () => {
		expect(envelopeBalanceCents({ needsCents: -500, wantsCents: 1_234 }, "needs")).toBe(0);
		expect(envelopeBalanceCents({ needsCents: -500, wantsCents: 1_234 }, "wants")).toBe(1_234);
	});
});
