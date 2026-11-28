import { describe, expect, it } from "vitest";
import { hasChanges } from "@/lib/has-changes";

const opened = { name: "Viaje a Cusco", amount: "2,000.00", month: "" };

describe("hasChanges", () => {
	it("the same values in a new object are no change", () => {
		expect(hasChanges(opened, { ...opened })).toBe(false);
	});

	it("a typed field is a change", () => {
		expect(hasChanges(opened, { ...opened, month: "2027-03" })).toBe(true);
	});

	it("typing and erasing back to what it opened with is no change", () => {
		const typed = { ...opened, name: "Viaje a Cusco!" };
		expect(hasChanges(opened, { ...typed, name: typed.name.slice(0, -1) })).toBe(false);
	});

	it("text is compared as typed: a space more is a change", () => {
		expect(hasChanges(opened, { ...opened, name: "Viaje a Cusco " })).toBe(true);
	});

	describe("a nested value, like the extra of an income", () => {
		const income = { extra: null, forNextCycle: true };
		const bonus = { ...income, extra: { type: "bonus", toSavings: false } };

		it("choosing an extra is a change", () => {
			expect(hasChanges(income, bonus)).toBe(true);
		});

		it("changing it and back, in a new object, is no change", () => {
			const back = { ...bonus, extra: { ...bonus.extra, type: "bonus" } };
			expect(hasChanges(bonus, back)).toBe(false);
		});

		it("a flag inside it is a change", () => {
			expect(hasChanges(bonus, { ...bonus, extra: { ...bonus.extra, toSavings: true } })).toBe(
				true,
			);
		});
	});
});
