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

export function isEmailDomainBlocked(emailAddress: string): boolean {
	const at = emailAddress.lastIndexOf("@");
	const domain = at < 1 ? "" : emailAddress.slice(at + 1);
	if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
	return GMAIL_TYPO_PATTERNS.some((pattern) => pattern.test(domain));
}
