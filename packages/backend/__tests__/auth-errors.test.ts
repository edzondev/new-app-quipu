import { describe, expect, test } from "vitest";
import { getAuthErrorMessage } from "../shared/auth-errors";

describe("getAuthErrorMessage", () => {
	test("a known code gets its own text", () => {
		expect(getAuthErrorMessage({ code: "INVALID_OTP" })).toBe("Código incorrecto.");
		expect(getAuthErrorMessage({ code: "OTP_EXPIRED" })).toBe("El código venció.");
	});

	test("a 429 asks to wait, whatever the code", () => {
		expect(getAuthErrorMessage({ status: 429, code: "INVALID_OTP" })).toBe(
			"Espera un momento antes de intentarlo otra vez.",
		);
	});

	test("an unknown code or no error falls back to the generic text", () => {
		const generic = "Algo salió mal. Inténtalo otra vez.";
		expect(getAuthErrorMessage({ code: "SOMETHING_NEW" })).toBe(generic);
		expect(getAuthErrorMessage(null)).toBe(generic);
	});
});
