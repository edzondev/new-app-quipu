import { expect, test } from "vitest";
import { authMessages, errorText, waitNotice } from "../shared/authMessages";

test("sign-in notices are in Spanish", () => {
	expect(authMessages.INVALID_OTP).toBe("El código no coincide.");
	expect(authMessages.OTP_EXPIRED).toBe("Este código venció. Pide otro.");
	expect(authMessages.TOO_MANY_ATTEMPTS).toBe("Te equivocaste 3 veces. Pide un código nuevo.");
	expect(authMessages.EMAIL_NOT_ALLOWED).toBe(
		"No podemos registrar cuentas con ese dominio de correo.",
	);
	expect(authMessages.PASSKEY).toBe("No pudimos usar tu llave. Prueba con un código al correo.");
	expect(waitNotice(65)).toBe("Podrás pedir otro código en 1:05");
	expect(JSON.stringify(authMessages).toLowerCase()).not.toContain("password");
});

test("each errorText code has its own phrase", () => {
	const phrases = [
		errorText("CODE_IF_ACCOUNT_EXISTS"),
		errorText("GENERIC"),
		errorText("INVALID_OTP"),
		errorText("OTP_EXPIRED"),
		errorText(undefined, "65", 429),
	];
	expect(phrases).toEqual([
		"Si este correo tiene cuenta, te llegó un código.",
		"No pudimos completar eso. Intenta de nuevo.",
		"El código no coincide.",
		"Este código venció. Pide otro.",
		"Podrás pedir otro código en 1:05",
	]);
	expect(new Set(phrases).size).toBe(phrases.length);
	expect(errorText("WAIT_TO_RESEND", "65")).toBe(phrases[4]);
	expect(errorText("EMAIL_NOT_ALLOWED")).toBe(
		"No podemos registrar cuentas con ese dominio de correo.",
	);
	expect(errorText("TOO_MANY_ATTEMPTS")).toBe("Te equivocaste 3 veces. Pide un código nuevo.");
	expect(errorText("UNKNOWN_CODE")).toBe("No pudimos completar eso. Intenta de nuevo.");
});
