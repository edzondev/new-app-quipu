export const inviteUrl = (code: string) => `${window.location.origin}/unirme/${code}`;

/** Opens the system share menu. "unavailable" means the browser has none; a cancel or a block is not an error. */
export async function shareInvite(code: string, inviterName: string) {
	if (!navigator.share) return "unavailable";
	try {
		await navigator.share({
			text: `${inviterName} te invitó a llevar juntos los gastos de la casa en Quipu`,
			url: inviteUrl(code),
		});
	} catch {
		// Cancelled or blocked: nothing to tell the person.
	}
	return "shared";
}

/** True when the text reached the clipboard. */
export async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
