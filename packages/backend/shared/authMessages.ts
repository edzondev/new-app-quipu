import { waitSeconds } from "./validation";

export const authMessages = {
	INVALID_OTP: "El código no coincide.",
	OTP_EXPIRED: "Este código venció. Pide otro.",
	TOO_MANY_ATTEMPTS: "Te equivocaste 3 veces. Pide un código nuevo.",
	EMAIL_NOT_ALLOWED: "No podemos registrar cuentas con ese dominio de correo.",
	PASSKEY: "No pudimos usar tu llave. Prueba con un código al correo.",
	ALREADY_HAD_ACCOUNT: "Ya tenías una cuenta con este correo. Entraste a ella.",
	CODE_IF_ACCOUNT_EXISTS: "Si este correo tiene cuenta, te llegó un código.",
	CODE_DURATION: "El código dura 10 minutos.",
	GENERIC: "No pudimos completar eso. Intenta de nuevo.",
} as const;

export function waitNotice(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	const remainder = Math.max(0, seconds % 60);
	return `Podrás pedir otro código en ${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function errorText(code: string | undefined, message?: string, status?: number) {
	if (code === "CODE_IF_ACCOUNT_EXISTS") return authMessages.CODE_IF_ACCOUNT_EXISTS;
	if (code === "GENERIC") return authMessages.GENERIC;
	if (code === "INVALID_OTP") return authMessages.INVALID_OTP;
	if (code === "OTP_EXPIRED") return authMessages.OTP_EXPIRED;
	if (code === "TOO_MANY_ATTEMPTS") return authMessages.TOO_MANY_ATTEMPTS;
	if (code === "EMAIL_NOT_ALLOWED") return authMessages.EMAIL_NOT_ALLOWED;
	if (code === "WAIT_TO_RESEND" || status === 429) {
		const seconds = waitSeconds.safeParse(message);
		if (seconds.success) return waitNotice(seconds.data);
		return "Podrás pedir otro código en un momento.";
	}
	return authMessages.GENERIC;
}
