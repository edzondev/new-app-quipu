import { describe, expect, it } from "vitest";
import { amountParts, freeCents, todaySpendSummary } from "./today-spend";

const free = { needsCents: 100_000, wantsCents: 50_000, pendingCents: 20_000, spentTodayCents: 0 };

describe("freeCents", () => {
	it("is Necesidades + Gustos minus what is left to pay", () => {
		expect(freeCents(free)).toBe(130_000);
	});

	it("adds back what was spent today, because the day's base does not drop with each expense", () => {
		expect(freeCents({ ...free, needsCents: 98_500, spentTodayCents: 1_500 })).toBe(130_000);
	});

	it("never goes below zero", () => {
		expect(freeCents({ ...free, needsCents: -90_000, wantsCents: 1_000 })).toBe(0);
	});

	it("keeps the cents", () => {
		expect(freeCents({ ...free, needsCents: 100_005, pendingCents: 0 })).toBe(150_005);
	});
});

describe("amountParts", () => {
	it("splits whole soles from two decimals", () => {
		expect(amountParts(6_859)).toEqual({ whole: "68", decimals: "59" });
	});

	it("pads the decimals and groups the thousands", () => {
		expect(amountParts(5)).toEqual({ whole: "0", decimals: "05" });
		expect(amountParts(123_456)).toEqual({ whole: "1,234", decimals: "56" });
		expect(amountParts(0)).toEqual({ whole: "0", decimals: "00" });
	});
});

describe("todaySpendSummary", () => {
	const day = { overCents: 0, spentTodayCents: 0, leftCents: 6_859, dailyCents: 6_859 };

	it("shows the daily number before spending anything", () => {
		expect(todaySpendSummary(day)).toEqual({
			whole: "68",
			decimals: "59",
			label: "Puedes gastar hoy",
			over: false,
			daily: true,
		});
	});

	it("shows what is left once something was spent today", () => {
		expect(todaySpendSummary({ ...day, spentTodayCents: 1_500, leftCents: 5_359 })).toMatchObject({
			whole: "53",
			decimals: "59",
			label: "Te queda hoy",
			over: false,
			daily: false,
		});
	});

	it("shows the overspend when the backend says you went over, even if you also spent today", () => {
		expect(todaySpendSummary({ ...day, spentTodayCents: 9_000, overCents: 2_141 })).toMatchObject({
			whole: "21",
			decimals: "41",
			label: "Hoy te pasaste",
			over: true,
			daily: false,
		});
	});

	it("shows S/ 0.00 when the whole day is spent exactly (not over)", () => {
		expect(todaySpendSummary({ ...day, spentTodayCents: 6_859, leftCents: 0 })).toMatchObject({
			whole: "0",
			decimals: "00",
			label: "Te queda hoy",
			over: false,
		});
	});

	it("shows S/ 0.00 as the daily number when nothing is free", () => {
		expect(todaySpendSummary({ ...day, dailyCents: 0, leftCents: 0 })).toMatchObject({
			whole: "0",
			decimals: "00",
			label: "Puedes gastar hoy",
			daily: true,
		});
	});
});
