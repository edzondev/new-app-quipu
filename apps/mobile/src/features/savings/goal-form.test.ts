import { describe, expect, it } from "vitest";
import {
	goalDraft,
	goalFields,
	goalNeedsPlus,
	monthOptions,
	removeGoalText,
	singleLine,
} from "./goal-form";

const draft = { name: "Viaje a Cusco", amount: "2000", month: "" };

describe("goalFields", () => {
	it("sends the name without the spaces around it", () => {
		const result = goalFields({ ...draft, name: "  Viaje a Cusco  " });
		expect(result.ok && result.fields.name).toBe("Viaje a Cusco");
	});

	it("a blank name asks for one", () => {
		const result = goalFields({ ...draft, name: "   " });
		expect(result.ok).toBe(false);
		expect(!result.ok && result.errors).toEqual({ name: "Ponle un nombre.", amount: undefined });
	});

	it("an empty or 0 amount asks how much", () => {
		for (const amount of ["", "0"]) {
			const result = goalFields({ ...draft, amount });
			expect(!result.ok && result.errors.amount).toBe("Define cuánto quieres juntar.");
		}
	});

	it("both errors show at once", () => {
		const result = goalFields({ name: "", amount: "", month: "" });
		expect(!result.ok && result.errors).toEqual({
			name: "Ponle un nombre.",
			amount: "Define cuánto quieres juntar.",
		});
	});

	it("a name of 40 characters with accents and an emoji goes as it is", () => {
		const name = `Mamá ${"ñ".repeat(33)}🎉`;
		expect(name).toHaveLength(40);
		const result = goalFields({ ...draft, name });
		expect(result.ok && result.fields.name).toBe(name);
	});

	it("without a month no targetMonth goes, so an edit clears it", () => {
		const result = goalFields(draft);
		expect(result.ok && result.fields).toEqual({ name: "Viaje a Cusco", targetCents: 200_000 });
	});

	it("with a month it goes along", () => {
		const result = goalFields({ ...draft, month: "2027-03" });
		expect(result.ok && result.fields.targetMonth).toBe("2027-03");
	});

	it("reads thousands in the amount", () => {
		const result = goalFields({ ...draft, amount: "1,500" });
		expect(result.ok && result.fields.targetCents).toBe(150_000);
	});
});

describe("goalDraft", () => {
	it("a new goal starts empty", () => {
		expect(goalDraft(null)).toEqual({ name: "", amount: "", month: "" });
	});

	it("an edit starts with the goal, and an empty month when it has none", () => {
		expect(goalDraft({ name: "Laptop", targetCents: 350_000, targetMonth: null })).toEqual({
			name: "Laptop",
			amount: "3,500.00",
			month: "",
		});
	});
});

describe("singleLine", () => {
	it("drops pasted line breaks, of any kind", () => {
		expect(singleLine("Viaje\na\r\nCusco\r")).toBe("ViajeaCusco");
	});

	it("leaves a single line as it is", () => {
		expect(singleLine("Viaje a Cusco ✈️")).toBe("Viaje a Cusco ✈️");
	});
});

describe("monthOptions", () => {
	it("this year starts at this month: past months cannot be chosen", () => {
		const options = monthOptions(2026, "2026-11-27");
		expect(options.map((option) => option.value)).toEqual(["2026-11", "2026-12"]);
		expect(options[0].label).toBe("Nov 2026");
	});

	it("a later year has its 12 months", () => {
		expect(monthOptions(2027, "2026-11-27")).toHaveLength(12);
	});
});

describe("goalNeedsPlus", () => {
	const personal = { space: "personal" as const, hasPlus: false };

	it("free Personal with 2 goals or more needs Plus for another", () => {
		expect(goalNeedsPlus({ ...personal, goalCount: 2 })).toBe(true);
		expect(goalNeedsPlus({ ...personal, goalCount: 3 })).toBe(true);
	});

	it("with fewer than 2 goals it does not", () => {
		expect(goalNeedsPlus({ ...personal, goalCount: 0 })).toBe(false);
		expect(goalNeedsPlus({ ...personal, goalCount: 1 })).toBe(false);
	});

	it("with Plus it never does", () => {
		expect(goalNeedsPlus({ ...personal, goalCount: 5, hasPlus: true })).toBe(false);
	});

	it("while Plus is unknown it leaves it to the backend", () => {
		expect(goalNeedsPlus({ ...personal, goalCount: 5, hasPlus: undefined })).toBe(false);
	});

	it("Nuestro espacio never does", () => {
		expect(goalNeedsPlus({ space: "household", goalCount: 5, hasPlus: false })).toBe(false);
	});
});

describe("removeGoalText", () => {
	it("with money it says the money goes to the fund", () => {
		expect(removeGoalText({ name: "Viaje", savedCents: 124_000 })).toBe(
			"Lo que ahorraste en «Viaje», S/ 1,240.00, pasa a tu fondo de emergencia. No se pierde nada.",
		);
	});

	it("without money only the goal goes", () => {
		expect(removeGoalText({ name: "Viaje", savedCents: 0 })).toBe(
			"«Viaje» no tiene dinero ahorrado. Solo se borra la meta.",
		);
	});
});
