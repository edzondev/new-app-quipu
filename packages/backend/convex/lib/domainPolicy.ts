import { ConvexError } from "convex/values";
import { correo } from "../../shared/validaciones";

/** Dominios desechables / abusivos observados + typos comunes de Gmail. */
const BLOCKED_EMAIL_DOMAINS = new Set([
	"kierko.com",
	"gmxxail.com",
	"guerrillamail.com",
	"guerrillamail.net",
	"mailinator.com",
	"tempmail.com",
	"throwaway.email",
	"yopmail.com",
	"10minutemail.com",
	"trashmail.com",
	"sharklasers.com",
	"getnada.com",
]);

const GMAIL_TYPO_PATTERNS = [
	// gm + 2–4 letras + ail (p. ej. gmxxail.com). El lookahead deja pasar gmxmail.com.
	/^gm(?!xmail\.com$)[a-z]{2,4}ail\.com$/i,
	/^gmai\.com$/i,
	/^gmai1\.com$/i,
	/^gnail\.com$/i,
];

export function extractEmailDomain(email: string): string {
	const at = email.lastIndexOf("@");
	if (at < 1) return "";
	return email.slice(at + 1);
}

export function isBlockedEmailDomain(domain: string): boolean {
	if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
	return GMAIL_TYPO_PATTERNS.some((pattern) => pattern.test(domain));
}

export function assertEmailAllowed(email: string): void {
	const leido = correo.safeParse(email);
	if (!leido.success) {
		throw new ConvexError({
			code: "INVALID_EMAIL",
			message: "Correo inválido.",
		});
	}
	const domain = extractEmailDomain(leido.data);
	if (isBlockedEmailDomain(domain)) {
		throw new ConvexError({
			code: "EMAIL_NOT_ALLOWED",
			message: "No podemos registrar cuentas con ese dominio de correo.",
		});
	}
}
