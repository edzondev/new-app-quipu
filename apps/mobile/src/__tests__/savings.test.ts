import { describe, expect, it } from "vitest";
import {
	contributeAvailable,
	contributeCents,
	contributeShortcut,
	goalDraft,
	goalFields,
	goalNeedsPlus,
	monthOptions,
	overAhorroText,
	overFundText,
	removeGoalText,
	singleLine,
	withdrawAvailable,
	type WithdrawDraft,
	withdrawFields,
} from "@/features/savings/savings";

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

const withdrawDraft = (patch: Partial<WithdrawDraft>): WithdrawDraft => ({
	amount: "250",
	reason: "emergency",
	note: "",
	...patch,
});

describe("withdrawFields", () => {
	it("takes up to the last cent of the fund and not one more", () => {
		expect(withdrawFields(withdrawDraft({ amount: "3052" }), 305_200)?.amountCents).toBe(305_200);
		expect(withdrawFields(withdrawDraft({ amount: "3052.01" }), 305_200)).toBeNull();
	});

	it("a withdrawal stops at S/ 1 000 000, even with more in the fund", () => {
		expect(withdrawFields(withdrawDraft({ amount: "1000000.01" }), 200_000_000)).toBeNull();
	});

	it("an empty amount or 0 cannot be sent", () => {
		expect(withdrawFields(withdrawDraft({ amount: "" }), 305_200)).toBeNull();
		expect(withdrawFields(withdrawDraft({ amount: "0" }), 305_200)).toBeNull();
	});

	it("with «Otro» the note goes trimmed", () => {
		expect(
			withdrawFields(withdrawDraft({ reason: "other", note: "  dentista " }), 305_200),
		).toEqual({
			amountCents: 25_000,
			reason: "other",
			note: "dentista",
		});
	});

	it("with «Otro» a blank note is no note", () => {
		expect(
			withdrawFields(withdrawDraft({ reason: "other", note: "   " }), 305_200)?.note,
		).toBeUndefined();
	});

	it("with any other reason the note is dropped, even if one was typed", () => {
		expect(
			withdrawFields(withdrawDraft({ reason: "emergency", note: "dentista" }), 305_200)?.note,
		).toBe(undefined);
	});

	it("a note of 40 characters goes and one of 41 does not", () => {
		const forty = "a".repeat(40);
		expect(withdrawFields(withdrawDraft({ reason: "other", note: forty }), 305_200)?.note).toBe(
			forty,
		);
		expect(
			withdrawFields(withdrawDraft({ reason: "other", note: `${forty}b` }), 305_200),
		).toBeNull();
	});
});

describe("withdrawAvailable and overFundText", () => {
	it("an edit counts the withdrawal it changes", () => {
		expect(withdrawAvailable(305_200, 25_000)).toBe(330_200);
	});

	it("says what the fund has once the amount does not fit", () => {
		expect(overFundText("3052.01", 305_200)).toBe("Tu fondo tiene S/ 3,052.");
		expect(overFundText("3052", 305_200)).toBeNull();
	});
});
