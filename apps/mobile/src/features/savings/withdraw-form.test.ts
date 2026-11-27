import { describe, expect, it } from "vitest";
import {
	overFundText,
	type WithdrawDraft,
	withdrawAvailable,
	withdrawFields,
} from "./withdraw-form";

const draft = (patch: Partial<WithdrawDraft>): WithdrawDraft => ({
	amount: "250",
	reason: "emergency",
	note: "",
	...patch,
});

describe("withdrawFields", () => {
	it("takes up to the last cent of the fund and not one more", () => {
		expect(withdrawFields(draft({ amount: "3052" }), 305_200)?.amountCents).toBe(305_200);
		expect(withdrawFields(draft({ amount: "3052.01" }), 305_200)).toBeNull();
	});

	it("a withdrawal stops at S/ 1 000 000, even with more in the fund", () => {
		expect(withdrawFields(draft({ amount: "1000000.01" }), 200_000_000)).toBeNull();
	});

	it("an empty amount or 0 cannot be sent", () => {
		expect(withdrawFields(draft({ amount: "" }), 305_200)).toBeNull();
		expect(withdrawFields(draft({ amount: "0" }), 305_200)).toBeNull();
	});

	it("with «Otro» the note goes trimmed", () => {
		expect(withdrawFields(draft({ reason: "other", note: "  dentista " }), 305_200)).toEqual({
			amountCents: 25_000,
			reason: "other",
			note: "dentista",
		});
	});

	it("with «Otro» a blank note is no note", () => {
		expect(withdrawFields(draft({ reason: "other", note: "   " }), 305_200)?.note).toBeUndefined();
	});

	it("with any other reason the note is dropped, even if one was typed", () => {
		expect(withdrawFields(draft({ reason: "emergency", note: "dentista" }), 305_200)?.note).toBe(
			undefined,
		);
	});

	it("a note of 40 characters goes and one of 41 does not", () => {
		const forty = "a".repeat(40);
		expect(withdrawFields(draft({ reason: "other", note: forty }), 305_200)?.note).toBe(forty);
		expect(withdrawFields(draft({ reason: "other", note: `${forty}b` }), 305_200)).toBeNull();
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
