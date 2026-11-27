import { formatCents, toCents, wholeSoles } from "@quipu/backend/shared/budget";
import { canSaveAmount } from "@/features/register/expense";
import { missingCents } from "./goal-progress";

/** The «S/ 100» shortcut. */
export const QUICK_CENTS = 10_000;

/** What can be saved: the cycle's Ahorro plus the saving being edited, never below 0. */
export function contributeAvailable(savingsCents: number, editingCents = 0) {
	return Math.max(0, savingsCents + editingCents);
}

/** The cents to save, or null while the amount is empty, 0, over a movement's cap or more than what is available. */
export function contributeCents(amount: string, available: number) {
	const cents = toCents(amount);
	return canSaveAmount(cents) && cents <= available ? cents : null;
}

/** The amber line: the amount does not fit, or there is nothing in Ahorro at all. */
export function overAhorroText(amount: string, available: number) {
	return toCents(amount) > available || available === 0
		? `Solo tienes S/ ${formatCents(available)} en Ahorro.`
		: null;
}

/** «Lo que falta» for a goal and «Todo el Ahorro» for the fund; none when it would be S/ 0. */
export function contributeShortcut(
	goal: { savedCents: number; targetCents: number } | null,
	available: number,
) {
	const cents = goal ? missingCents(goal.savedCents, goal.targetCents) : available;
	if (cents === 0) return null;
	return { label: `${goal ? "Lo que falta" : "Todo el Ahorro"} · S/ ${wholeSoles(cents)}`, cents };
}
