import { dayInMonth } from "./dates";

export type MonthlyCommitment = { amountCents: number; dueDay: number };

// Due dates inside [from, until], oldest first. A commitment only counts from the day it exists.
export function getMonthlyDueDates(dueDay: number, from: string, until: string): string[] {
	const [year, month] = from.split("-").map(Number);
	const dates: string[] = [];
	for (let offset = 0; ; offset++) {
		const date = dayInMonth(year, month - 1 + offset, dueDay);
		if (date > until) return dates;
		if (date >= from) dates.push(date);
	}
}

export function getPendingCents(
	commitments: MonthlyCommitment[],
	today: string,
	cycleEnd: string,
): number {
	return commitments.reduce(
		(sum, { amountCents, dueDay }) =>
			sum + amountCents * getMonthlyDueDates(dueDay, today, cycleEnd).length,
		0,
	);
}
