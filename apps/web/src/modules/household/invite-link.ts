import { type ShareResult, shareFailure } from "@quipu/backend/shared/household";
import { toastManager } from "#/components/ui/toast";

export const inviteUrl = (code: string) => `${window.location.origin}/unirme/${code}`;

/** Opens the system share menu, and says whether it shared, was closed, or there was none. */
export async function shareInvite(code: string, inviterName: string): Promise<ShareResult> {
	if (!navigator.share) return "unavailable";
	try {
		await navigator.share({
			text: `${inviterName} te invitó a llevar juntos los gastos de la casa en Quipu`,
			url: inviteUrl(code),
		});
		return "shared";
	} catch (error) {
		return shareFailure(error);
	}
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

/** One toast for the invite: repeating Compartir or Copiar replaces it instead of stacking another. */
export function inviteToast(title: string) {
	toastManager.add({ id: "invite", title, type: "success" });
}
