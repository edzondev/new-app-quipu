/** The form an email is stored and looked up in: trimmed and lowercase. */
export function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}
