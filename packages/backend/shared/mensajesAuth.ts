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

export function textoDelError(code: string | undefined, message?: string, status?: number) {
	if (code === "CODIGO_SI_HAY_CUENTA") return mensajesAuth.CODIGO_SI_HAY_CUENTA;
	if (code === "GENERICO") return mensajesAuth.GENERICO;
	if (code === "INVALID_OTP") return mensajesAuth.INVALID_OTP;
	if (code === "OTP_EXPIRED") return mensajesAuth.OTP_EXPIRED;
	if (code === "TOO_MANY_ATTEMPTS") return mensajesAuth.TOO_MANY_ATTEMPTS;
	if (code === "EMAIL_NOT_ALLOWED") return mensajesAuth.EMAIL_NOT_ALLOWED;
	if (code === "ESPERA_REENVIO" || status === 429) {
		const segundos = Number(message);
		if (Number.isFinite(segundos)) return avisoDeEspera(segundos);
		return "Podrás pedir otro código en un momento.";
	}
	return mensajesAuth.GENERICO;
}
