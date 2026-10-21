import { expect, test } from "vitest";
import { avisoDeEspera, mensajesAuth } from "../shared/mensajesAuth";

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
