export type AuthError = { code?: string; status?: number } | null | undefined;

const messages: Record<string, string> = {
	INVALID_OTP: "El código no es correcto.",
	OTP_EXPIRED: "Este código ya venció. Pide uno nuevo.",
	TOO_MANY_ATTEMPTS: "Hiciste muchos intentos. Pide un código nuevo.",
	INVALID_EMAIL: "Revisa tu correo.",
	USER_NOT_FOUND: "No tienes cuenta con este correo.",
};

export function getAuthErrorMessage(error: AuthError): string {
	// 429 = our code-send limit (convex/rateLimits.ts) or Better Auth's own limit
	if (error?.status === 429) return "Espera un momento antes de intentarlo otra vez.";
	return (error?.code && messages[error.code]) || "Algo salió mal. Inténtalo otra vez.";
}
