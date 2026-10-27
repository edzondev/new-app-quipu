type AuthError = { code?: string; status?: number } | null | undefined;

const messages: Record<string, string> = {
	INVALID_OTP: "El código no es correcto.",
	OTP_EXPIRED: "Este código ya venció. Pide uno nuevo.",
	TOO_MANY_ATTEMPTS: "Hiciste muchos intentos. Pide un código nuevo.",
	INVALID_EMAIL: "Revisa tu correo.",
};

export function getAuthErrorMessage(error: AuthError): string {
	// 429 = Better Auth rate limit (enabled in production)
	if (error?.status === 429) return "Espera un momento antes de intentarlo otra vez.";
	return (error?.code && messages[error.code]) || "Algo salió mal. Inténtalo otra vez.";
}
