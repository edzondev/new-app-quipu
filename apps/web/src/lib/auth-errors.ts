export type AuthError = { code?: string; status?: number } | null | undefined;

const messages: Record<string, string> = {
	INVALID_OTP: "Código incorrecto.",
	OTP_EXPIRED: "El código venció.",
	TOO_MANY_ATTEMPTS: "Demasiados intentos. Pide un código nuevo.",
	INVALID_EMAIL: "Correo inválido.",
};

export function getAuthErrorMessage(error: AuthError): string {
	// 429 = our code-send limit (convex/rateLimits.ts) or Better Auth's own limit
	if (error?.status === 429) return "Espera un momento antes de intentarlo otra vez.";
	return (error?.code && messages[error.code]) || "Algo salió mal. Inténtalo otra vez.";
}
