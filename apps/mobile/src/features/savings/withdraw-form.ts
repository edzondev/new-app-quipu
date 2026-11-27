import type { api } from "@quipu/backend/convex/_generated/api";
import { NOTE_MAX_LENGTH, toCents, wholeSoles } from "@quipu/backend/shared/budget";
import type { FunctionArgs } from "convex/server";
import { canSaveAmount } from "@/features/register/expense";

export type Reason = FunctionArgs<typeof api.transactions.withdrawSaving>["reason"];

export const REASONS: readonly Reason[] = ["emergency", "unexpected", "mistake", "other"];

export const REASON_LABELS: Record<Reason, string> = {
	emergency: "Emergencia",
	unexpected: "Algo imprevisto",
	mistake: "Me equivoqué al aportar",
	other: "Otro",
};

export type WithdrawDraft = { amount: string; reason: Reason; note: string };

/** What is in the fund, plus the withdrawal being edited. */
export function withdrawAvailable(fundCents: number, editingCents = 0) {
	return fundCents + editingCents;
}

export function overFundText(amount: string, available: number) {
	return toCents(amount) > available ? `Tu fondo tiene S/ ${wholeSoles(available)}.` : null;
}

/** The withdrawal to send, or null while it cannot be. The note goes only with «Otro», trimmed. */
export function withdrawFields(draft: WithdrawDraft, available: number) {
	const amountCents = toCents(draft.amount);
	const note = draft.note.trim();
	if (!canSaveAmount(amountCents) || amountCents > available || note.length > NOTE_MAX_LENGTH) {
		return null;
	}
	return {
		amountCents,
		reason: draft.reason,
		note: draft.reason === "other" && note ? note : undefined,
	};
}
