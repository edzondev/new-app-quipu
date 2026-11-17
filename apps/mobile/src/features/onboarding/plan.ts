import { getDailyBudget, splitIncome, toCents } from "@quipu/backend/shared/budget";
import { dayInMonth, daysBetween, formatDay } from "@quipu/backend/shared/dates";
import type { Split } from "@quipu/backend/shared/plan";

export const DEFAULT_SPLIT: Split = { needs: 50, wants: 30, savings: 20 };
export const SPLIT_STEP = 5;

type Range = { startDate: string; endDate: string };

export function stepSplit(split: Split, key: keyof Split, delta: number): Split {
	return { ...split, [key]: Math.min(100, Math.max(0, split[key] + delta)) };
}

/** A fixed monthly payment as typed in B3s: the texts are parsed when the number is worked out. */
export type FixedItem = { id: string; name: string; dayText: string; amountText: string };

export const FIXED_SHORTCUTS = ["Alquiler", "Celular", "Internet", "Servicios", "Otro"];

/** «20 – 31 oct», or both months when the cycle crosses one. */
export function rangeText({ startDate, endDate }: Range) {
	const sameMonth = startDate.slice(0, 7) === endDate.slice(0, 7);
	return `${sameMonth ? Number(startDate.slice(8)) : formatDay(startDate)} – ${formatDay(endDate)}`;
}

/** What the fixed payments that fall inside the first cycle take before the split. */
function reservedCents(range: Range, items: FixedItem[]) {
	const [year, month] = range.startDate.split("-").map(Number);
	return items.reduce((total, item) => {
		const day = Math.min(31, Math.max(1, Number(item.dayText) || 1));
		const dues = [dayInMonth(year, month - 1, day), dayInMonth(year, month, day)];
		const falls = dues.some((due) => due >= range.startDate && due <= range.endDate);
		return falls ? total + toCents(item.amountText) : total;
	}, 0);
}

/** The number B3 shows: the same rule as Inicio, with today's money and the days of the first cycle. */
export function firstNumber({
	todayCents,
	split,
	range,
	items,
}: {
	todayCents: number;
	split: Split;
	range: Range;
	items: FixedItem[];
}) {
	const daysLeft = daysBetween(range.startDate, range.endDate) + 1;
	const envelopes = splitIncome(todayCents, split);
	const free = envelopes.needsCents + envelopes.wantsCents;
	const dailyWith = (reserved: number) =>
		getDailyBudget({ freeCents: free - reserved, spentTodayCents: 0, daysLeft }).baseCents;
	const reserved = reservedCents(range, items);

	return {
		envelopes,
		reservedCents: reserved,
		dailyCents: dailyWith(reserved),
		dailyWithoutFixedCents: dailyWith(0),
		overIncome: reserved > todayCents,
	};
}
