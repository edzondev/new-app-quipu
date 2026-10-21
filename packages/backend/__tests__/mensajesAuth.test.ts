import { expect, test } from "vitest";
import { avisoDeEspera, mensajesAuth, textoDelError } from "../shared/mensajesAuth";

test("los avisos de entrar están en español de tú", () => {
	expect(mensajesAuth.INVALID_OTP).toBe("El código no coincide.");
	expect(mensajesAuth.OTP_EXPIRED).toBe("Este código venció. Pide otro.");
	expect(mensajesAuth.TOO_MANY_ATTEMPTS).toBe("Te equivocaste 3 veces. Pide un código nuevo.");
	expect(mensajesAuth.EMAIL_NOT_ALLOWED).toBe(
		"No podemos registrar cuentas con ese dominio de correo.",
	);
	expect(mensajesAuth.LLAVE).toBe("No pudimos usar tu llave. Prueba con un código al correo.");
	expect(avisoDeEspera(65)).toBe("Podrás pedir otro código en 1:05");
	expect(JSON.stringify(mensajesAuth).toLowerCase()).not.toContain("password");
});

test("cada código de textoDelError tiene su propia frase", () => {
	const frases = [
		textoDelError("CODIGO_SI_HAY_CUENTA"),
		textoDelError("GENERICO"),
		textoDelError("INVALID_OTP"),
		textoDelError("OTP_EXPIRED"),
		textoDelError(undefined, "65", 429),
	];
	expect(frases).toEqual([
		"Si este correo tiene cuenta, te llegó un código.",
		"No pudimos completar eso. Intenta de nuevo.",
		"El código no coincide.",
		"Este código venció. Pide otro.",
		"Podrás pedir otro código en 1:05",
	]);
	expect(new Set(frases).size).toBe(frases.length);
	expect(textoDelError("ESPERA_REENVIO", "65")).toBe(frases[4]);
});
