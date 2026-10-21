export const mensajesAuth = {
	INVALID_OTP: "El código no coincide.",
	OTP_EXPIRED: "Este código venció. Pide otro.",
	TOO_MANY_ATTEMPTS: "Te equivocaste 3 veces. Pide un código nuevo.",
	EMAIL_NOT_ALLOWED: "No podemos registrar cuentas con ese dominio de correo.",
	LLAVE: "No pudimos usar tu llave. Prueba con un código al correo.",
	YA_TENIAS_CUENTA: "Ya tenías una cuenta con este correo. Entraste a ella.",
	CODIGO_SI_HAY_CUENTA: "Si este correo tiene cuenta, te llegó un código.",
	CODIGO_DURA: "El código dura 10 minutos.",
	GENERICO: "No pudimos completar eso. Intenta de nuevo.",
} as const;

export function avisoDeEspera(segundos: number) {
	const minutos = Math.floor(segundos / 60);
	const resto = Math.max(0, segundos % 60);
	return `Podrás pedir otro código en ${minutos}:${resto.toString().padStart(2, "0")}`;
}
