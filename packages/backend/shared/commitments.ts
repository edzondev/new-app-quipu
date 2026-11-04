import { addDays, dayInMonth } from "./dates";

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

export type Schedule =
	| { frequency: "monthly"; dueDay: number }
	| { frequency: "once"; dueDate: string };

export type CommitmentStatus = "paid" | "overdue" | "upcoming" | "reserved" | "later";
export type Occurrence = { dueDate: string; status: CommitmentStatus };

const UPCOMING_DAYS = 3;

export function isReserved(status: CommitmentStatus): boolean {
	return status === "overdue" || status === "upcoming" || status === "reserved";
}

function getOpenStatus(dueDate: string, today: string, cycleEnd: string): CommitmentStatus {
	if (dueDate < today) return "overdue";
	if (dueDate > cycleEnd) return "later";
	return dueDate <= addDays(today, UPCOMING_DAYS) ? "upcoming" : "reserved";
}

// Oldest first. A monthly one counts from the day it was created, up to the cycle end.
// A one-off always has its single date, even when it falls after the cycle.
function getDueDates(schedule: Schedule, createdOn: string, cycleEnd: string): string[] {
	return schedule.frequency === "once"
		? [schedule.dueDate]
		: getMonthlyDueDates(schedule.dueDay, createdOn, cycleEnd);
}

// State comes from dates and the payment count alone: each payment settles the oldest
// occurrence still open, so deleting a payment reopens it with no stored flag.
export function getOccurrences(
	schedule: Schedule,
	createdOn: string,
	paidCount: number,
	today: string,
	cycleEnd: string,
): Occurrence[] {
	return getDueDates(schedule, createdOn, cycleEnd).map((dueDate, index) => ({
		dueDate,
		status: index < paidCount ? "paid" : getOpenStatus(dueDate, today, cycleEnd),
	}));
}
