import { formatCents } from "@quipu/backend/shared/budget";
import { monthName } from "@quipu/backend/shared/dates";

/** Same rule as the web: whole percent, capped at 100. */
export function goalPercent(savedCents: number, targetCents: number) {
	return Math.min(100, Math.floor((savedCents / targetCents) * 100));
}

export function missingCents(savedCents: number, targetCents: number) {
	return Math.max(0, targetCents - savedCents);
}

/** "1,240" for exact soles, "1,240.50" when there are cents. The caller adds "S/". */
export function wholeSoles(cents: number) {
	const text = formatCents(cents);
	return text.endsWith(".00") ? text.slice(0, -3) : text;
}

/** Months of Needs the fund covers (a month is a third of the suggested fund goal), cut to 1 decimal: "1.6 meses". */
export function monthsCovered(fundCents: number, suggestedFundGoalCents: number | null) {
	if (suggestedFundGoalCents === null) return null;
	const tenths = Math.floor((fundCents * 30) / suggestedFundGoalCents);
	const months = tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
	return `${months} ${tenths === 10 ? "mes" : "meses"}`;
}

/** "Mar 2027", or "Sin fecha" when the goal has no month. */
export function targetMonthLabel(targetMonth: string | null) {
	if (targetMonth === null) return "Sin fecha";
	const month = monthName(targetMonth).slice(0, 3);
	return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${targetMonth.slice(0, 4)}`;
}
