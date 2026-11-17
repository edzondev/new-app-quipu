export const CODE_LENGTH = 6;

// Forma simple: el servidor valida de verdad. Pasa a shared al conectar Convex.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(raw: string): string | null {
	const email = raw.trim();
	if (email === "") return "Escribe tu correo.";
	return EMAIL_SHAPE.test(email) ? null : "Correo inválido.";
}

export function otpDigits(raw: string): string {
	return raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function formatClock(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Same wait as the server: one code per email every 90 s (convex/rateLimits.ts). */
export const RESEND_SECONDS = 90;
