import { monthName } from "@quipu/backend/shared/dates";
import { FUND_GOAL_MONTHS } from "@quipu/backend/shared/plan";

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
