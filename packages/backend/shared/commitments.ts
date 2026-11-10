import type { Infer } from "convex/values";
import type { dueAdjustment, dueRule } from "../convex/schema";
import { addDays, dayInMonth, shiftMonth } from "./dates";

export type DueRule = Infer<typeof dueRule>;
export type DueAdjustment = Infer<typeof dueAdjustment>;

export const MAX_DAYS_BEFORE_END = 10;
const MID_MONTH_DAY = 15;

export function isValidRule(rule: DueRule): boolean {
	if (rule.kind === "day") return Number.isInteger(rule.day) && rule.day >= 1 && rule.day <= 31;
	if (rule.kind === "beforeEnd") {
		return Number.isInteger(rule.days) && rule.days >= 1 && rule.days <= MAX_DAYS_BEFORE_END;
	}
	return true;
}

/** "el 28", "último día", "3 días antes del fin" or "quincena". */
export function ruleText(rule: DueRule): string {
	switch (rule.kind) {
		case "day":
			return `el ${rule.day}`;
		case "last":
			return "último día";
		case "beforeEnd":
			return `${rule.days} ${rule.days === 1 ? "día antes" : "días antes"} del fin`;
		case "mid":
			return "quincena";
	}
}

/**
 * The due date of a monthly commitment in `month` ("2026-11"). The adjustment wins for its own
 * month only; the next month goes back to the rule. A fixed day clamps to the last day of a short month.
 */
export function dueDateFor(
	rule: DueRule,
	adjustment: DueAdjustment | undefined,
	month: string,
): string {
	if (adjustment?.month === month) return `${month}-${String(adjustment.day).padStart(2, "0")}`;
	const [year, monthNumber] = month.split("-").map(Number);
	const last = dayInMonth(year, monthNumber - 1, "last");
	switch (rule.kind) {
		case "day":
			return dayInMonth(year, monthNumber - 1, rule.day);
		case "last":
			return last;
		case "beforeEnd":
			return addDays(last, -rule.days);
		case "mid":
			return dayInMonth(year, monthNumber - 1, MID_MONTH_DAY);
	}
}

export type RuleKind = DueRule["kind"];

/** The rule a "Vence" field describes. `amount` is the day (1–31) or the days before the end (1–10). */
export function ruleFromChoice(kind: RuleKind, amount: string): DueRule | null {
	const rule: DueRule =
		kind === "day"
			? { kind, day: Number(amount) }
			: kind === "beforeEnd"
				? { kind, days: Number(amount) }
				: { kind };
	return isValidRule(rule) ? rule : null;
}

/** The inverse, to fill the field when editing. */
export function choiceOfRule(rule: DueRule): { kind: RuleKind; amount: string } {
	if (rule.kind === "day") return { kind: rule.kind, amount: String(rule.day) };
	if (rule.kind === "beforeEnd") return { kind: rule.kind, amount: String(rule.days) };
	return { kind: rule.kind, amount: "" };
}

/** Whether `day` exists in `month` ("2026-02" has no 30). */
export function dayExistsIn(month: string, day: number): boolean {
	const [year, monthNumber] = month.split("-").map(Number);
	return (
		Number.isInteger(day) &&
		day >= 1 &&
		day <= Number(dayInMonth(year, monthNumber - 1, "last").slice(8))
	);
}

export type MonthlyCommitment = { amountCents: number; dueDay: number };

// Due dates inside [from, until], oldest first. A commitment only counts from the day it exists.
export function getMonthlyDueDates(
	rule: DueRule,
	adjustment: DueAdjustment | undefined,
	from: string,
	until: string,
): string[] {
	const [year, month] = from.split("-").map(Number);
	const dates: string[] = [];
	for (let offset = 0; ; offset++) {
		const monthKey = dayInMonth(year, month - 1 + offset, 1).slice(0, 7);
		const date = dueDateFor(rule, adjustment, monthKey);
		if (date > until) return dates;
		// A day moved by hand may fall before the commitment existed: it still counts, as overdue.
		if (date >= from || adjustment?.month === monthKey) dates.push(date);
	}
}

export function getPendingCents(
	commitments: MonthlyCommitment[],
	today: string,
	cycleEnd: string,
): number {
	return commitments.reduce(
		(sum, { amountCents, dueDay }) =>
			sum +
			amountCents *
				getMonthlyDueDates({ kind: "day", day: dueDay }, undefined, today, cycleEnd).length,
		0,
	);
}

export type Schedule =
	| { frequency: "monthly"; rule: DueRule; adjustment?: DueAdjustment }
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
		: getMonthlyDueDates(schedule.rule, schedule.adjustment, createdOn, cycleEnd);
}

/** A payment of a commitment. `forMonth` ("2026-10") is the month a monthly payment covers. */
export type CommitmentPayment = { forMonth?: string };

/**
 * The due date each payment settled (undefined if it settled none now). A payment that knows its
 * month settles that month, whatever the rule says today. An older payment, saved before payments
 * knew their month, settles the oldest date nobody else took. This is the only place that
 * reads old payments.
 */
export function settledDates(
	dueDates: string[],
	payments: CommitmentPayment[],
): (string | undefined)[] {
	const byMonth = new Map(dueDates.map((date) => [date.slice(0, 7), date]));
	const taken = new Set<string>();
	const known = payments.map(({ forMonth }) => {
		const date = forMonth === undefined ? undefined : byMonth.get(forMonth);
		if (date) taken.add(date);
		return date;
	});
	const free = dueDates.filter((date) => !taken.has(date));
	let next = 0;
	return payments.map(({ forMonth }, index) =>
		forMonth === undefined ? free[next++] : known[index],
	);
}

// State comes from dates and the payments alone, so deleting a payment reopens its date with
// no stored flag. A payment settles the month it was made for, not its position in the list.
export function getOccurrences(
	schedule: Schedule,
	createdOn: string,
	payments: CommitmentPayment[],
	today: string,
	cycleEnd: string,
): Occurrence[] {
	const dueDates = getDueDates(schedule, createdOn, cycleEnd);
	const paid = new Set(settledDates(dueDates, payments));
	return dueDates.map((dueDate) => ({
		dueDate,
		status: paid.has(dueDate) ? "paid" : getOpenStatus(dueDate, today, cycleEnd),
	}));
}

/** The first due date of a monthly after `date`, looking month by month as far as it takes. */
function nextMonthlyDueDate(rule: DueRule, adjustment: DueAdjustment | undefined, date: string) {
	for (let month = date.slice(0, 7); ; month = shiftMonth(month, 1)) {
		const dueDate = dueDateFor(rule, adjustment, month);
		if (dueDate > date) return dueDate;
	}
}

// First due date after `date`. A monthly with no charge left in the cycle still has one: the next month's.
export function getNextDueDate(schedule: Schedule, date: string): string {
	if (schedule.frequency === "once") return schedule.dueDate;
	return nextMonthlyDueDate(schedule.rule, schedule.adjustment, date);
}
