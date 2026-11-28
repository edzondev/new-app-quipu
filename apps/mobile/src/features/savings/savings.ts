import type { api } from "@quipu/backend/convex/_generated/api";
import { FREE_PERSONAL_GOAL_CAP } from "@quipu/backend/shared/billing";
import { formatCents, NOTE_MAX_LENGTH, toCents, wholeSoles } from "@quipu/backend/shared/budget";
import { monthName, monthsOfYear } from "@quipu/backend/shared/dates";
import { FUND_GOAL_MONTHS } from "@quipu/backend/shared/plan";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { canSaveAmount } from "@/features/register/register";

/** Same rule as the web: whole percent, capped at 100. */
export function goalPercent(savedCents: number, targetCents: number) {
	return Math.min(100, Math.floor((savedCents / targetCents) * 100));
}

export function missingCents(savedCents: number, targetCents: number) {
	return Math.max(0, targetCents - savedCents);
}

export function monthsCovered(fundCents: number, suggestedFundGoalCents: number | null) {
	if (suggestedFundGoalCents === null || suggestedFundGoalCents <= 0) return null;
	const tenths = Math.floor((fundCents * FUND_GOAL_MONTHS * 10) / suggestedFundGoalCents);
	const months = tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
	return `${months} ${tenths === 10 ? "mes" : "meses"}`;
}

/** "Mar 2027", or "Sin fecha" when the goal has no month. */
export function targetMonthLabel(targetMonth: string | null) {
	if (targetMonth === null) return "Sin fecha";
	const month = monthName(targetMonth).slice(0, 3);
	return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${targetMonth.slice(0, 4)}`;
}

type Goal = FunctionReturnType<typeof api.goals.list>[number];

export type GoalDraft = { name: string; amount: string; month: string };

export function goalDraft(
	goal: Pick<Goal, "name" | "targetCents" | "targetMonth"> | null,
): GoalDraft {
	if (!goal) return { name: "", amount: "", month: "" };
	return { name: goal.name, amount: formatCents(goal.targetCents), month: goal.targetMonth ?? "" };
}

/** The web's checks. Without a month no `targetMonth` goes, so an edit clears it. */
export function goalFields(draft: GoalDraft) {
	const name = draft.name.trim();
	const targetCents = toCents(draft.amount);
	if (!name || targetCents <= 0) {
		return {
			ok: false as const,
			errors: {
				name: name ? undefined : "Ponle un nombre.",
				amount: targetCents > 0 ? undefined : "Define cuánto quieres juntar.",
			},
		};
	}
	return {
		ok: true as const,
		fields: { name, targetCents, ...(draft.month ? { targetMonth: draft.month } : {}) },
	};
}

/** A pasted line break would end up in the name: a web text field drops it, so this does too. */
export function singleLine(text: string) {
	return text.replace(/[\r\n]/g, "");
}

/** The months of `year` that can still be chosen. */
export function monthOptions(year: number, today: string) {
	return monthsOfYear(year, today, "")
		.filter((cell) => !cell.past)
		.map((cell) => ({ value: cell.month, label: targetMonthLabel(cell.month) }));
}

/** Free Personal keeps 2 goals; a household writes only with Plus already. Unknown Plus: the backend decides. */
export function goalNeedsPlus({
	space,
	goalCount,
	hasPlus,
}: {
	space: "personal" | "household";
	goalCount: number;
	hasPlus: boolean | undefined;
}) {
	return space === "personal" && goalCount >= FREE_PERSONAL_GOAL_CAP && hasPlus === false;
}

export function removeGoalText(goal: Pick<Goal, "name" | "savedCents">) {
	return goal.savedCents > 0
		? `Lo que ahorraste en «${goal.name}», S/ ${formatCents(goal.savedCents)}, pasa a tu fondo de emergencia. No se pierde nada.`
		: `«${goal.name}» no tiene dinero ahorrado. Solo se borra la meta.`;
}

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

type Reason = FunctionArgs<typeof api.transactions.withdrawSaving>["reason"];

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
