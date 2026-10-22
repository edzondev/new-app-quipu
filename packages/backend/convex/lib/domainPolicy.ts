import { ConvexError } from "convex/values";
import { email } from "../../shared/validation";

/** Disposable / abusive domains observed, plus common Gmail typos. */
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
	// gm + 2–4 letters + ail (e.g. gmxxail.com). Lookahead still allows gmxmail.com.
	/^gm(?!xmail\.com$)[a-z]{2,4}ail\.com$/i,
	/^gmai\.com$/i,
	/^gmai1\.com$/i,
	/^gnail\.com$/i,
];

export function extractEmailDomain(emailAddress: string): string {
	const at = emailAddress.lastIndexOf("@");
	if (at < 1) return "";
	return emailAddress.slice(at + 1);
}

export function isBlockedEmailDomain(domain: string): boolean {
	if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
	return GMAIL_TYPO_PATTERNS.some((pattern) => pattern.test(domain));
}

export function assertEmailAllowed(emailAddress: string): void {
	const parsed = email.safeParse(emailAddress);
	if (!parsed.success) {
		throw new ConvexError({
			code: "INVALID_EMAIL",
			message: "Invalid email.",
		});
	}
	const domain = extractEmailDomain(parsed.data);
	if (isBlockedEmailDomain(domain)) {
		throw new ConvexError({
			code: "EMAIL_NOT_ALLOWED",
			message: "We cannot register accounts with that email domain.",
		});
	}
}
