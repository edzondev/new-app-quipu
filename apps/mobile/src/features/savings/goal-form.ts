import type { api } from "@quipu/backend/convex/_generated/api";
import { FREE_PERSONAL_GOAL_CAP } from "@quipu/backend/shared/billing";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { monthsOfYear } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";
import { targetMonthLabel } from "./goal-progress";

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
