import { describe, expect, it } from "vitest";
import {
	contributeAvailable,
	contributeCents,
	contributeShortcut,
	overAhorroText,
} from "./contribute-form";

describe("contributeAvailable", () => {
	it("is the cycle's Ahorro, plus the saving being edited", () => {
		expect(contributeAvailable(40_000)).toBe(40_000);
		expect(contributeAvailable(40_000, 5_000)).toBe(45_000);
	});

	it("never goes below 0", () => {
		expect(contributeAvailable(-1_000)).toBe(0);
	});
});

describe("contributeCents", () => {
	it("takes up to the last cent of Ahorro and not one more", () => {
		expect(contributeCents("400", 40_000)).toBe(40_000);
		expect(contributeCents("400.01", 40_000)).toBeNull();
		expect(contributeCents("399.99", 40_000)).toBe(39_999);
	});

	it("an empty amount or 0 cannot be saved", () => {
		expect(contributeCents("", 40_000)).toBeNull();
		expect(contributeCents("0", 40_000)).toBeNull();
	});

	it("a movement stops at S/ 1 000 000, like Registrar, even with more in Ahorro", () => {
		expect(contributeCents("1000000", 200_000_000)).toBe(100_000_000);
		expect(contributeCents("1000000.01", 200_000_000)).toBeNull();
	});

	it("reads a decimal comma and thousands like the web", () => {
		expect(contributeCents("1,5", 40_000)).toBe(150);
		expect(contributeCents("1,500", 200_000)).toBe(150_000);
	});
});

describe("overAhorroText", () => {
	it("says how much there is once the amount does not fit", () => {
		expect(overAhorroText("400.01", 40_000)).toBe("Solo tienes S/ 400.00 en Ahorro.");
		expect(overAhorroText("400", 40_000)).toBeNull();
	});

	it("with Ahorro at 0 it shows even before typing", () => {
		expect(overAhorroText("", 0)).toBe("Solo tienes S/ 0.00 en Ahorro.");
	});
});

describe("contributeShortcut", () => {
	it("a goal offers what is missing", () => {
		expect(contributeShortcut({ savedCents: 124_000, targetCents: 200_000 }, 40_000)).toEqual({
			label: "Lo que falta · S/ 760",
			cents: 76_000,
		});
	});

	it("a reached goal offers nothing", () => {
		expect(contributeShortcut({ savedCents: 60_000, targetCents: 60_000 }, 40_000)).toBeNull();
		expect(contributeShortcut({ savedCents: 70_000, targetCents: 60_000 }, 40_000)).toBeNull();
	});

	it("the fund offers all of Ahorro, and nothing when Ahorro is 0", () => {
		expect(contributeShortcut(null, 40_050)).toEqual({
			label: "Todo el Ahorro · S/ 400.50",
			cents: 40_050,
		});
		expect(contributeShortcut(null, 0)).toBeNull();
	});
});
