import * as z from "zod/mini";
import type { Cadence, CycleStartDay } from "./plan";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = "ene feb mar abr may jun jul ago set oct nov dic".split(" ");
const MONTH_NAMES =
	"enero febrero marzo abril mayo junio julio agosto setiembre octubre noviembre diciembre".split(
		" ",
	);
const WEEKDAYS = "dom lun mar mié jue vie sáb".split(" ");
const limaDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

export function getLimaDate(now = new Date()): string {
	return limaDateFormat.format(now);
}

const limaTimeFormat = new Intl.DateTimeFormat("en-GB", {
	timeZone: "America/Lima",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

/** "10:42" in Lima for a time in milliseconds. */
export function formatLimaTime(at: number): string {
	return limaTimeFormat.format(at);
}

export const isoDateSchema = z.iso.date();

/** A month as "2026-11". */
export const monthSchema = z.string().check(z.regex(/^\d{4}-(0[1-9]|1[0-2])$/));

function toUtc(date: string): number {
	return Date.parse(`${date}T00:00:00Z`);
}

function fromUtc(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
	return fromUtc(toUtc(date) + days * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
	return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

const EARLY_INCOME_DAYS: Record<Cadence, number> = { monthly: 3, biweekly: 2, weekly: 1 };

/** The last days of a cycle (3 monthly, 2 biweekly, 1 weekly), today included. */
export function isEarlyIncomeWindow(cadence: Cadence, today: string, endDate: string): boolean {
	return daysBetween(today, endDate) < EARLY_INCOME_DAYS[cadence];
}

// month is 0-based and may overflow (-1, 12); Date.UTC rolls the year.
export function dayInMonth(year: number, month: number, day: number | "last"): string {
	const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
	return fromUtc(Date.UTC(year, month, day === "last" ? lastDay : Math.min(day, lastDay)));
}

export function getCycleRange(cadence: Cadence, startDay: CycleStartDay, date: string) {
	if (cadence === "weekly") {
		const weekday = new Date(toUtc(date)).getUTCDay();
		const startDate = addDays(date, -((weekday - Number(startDay) + 7) % 7));
		return { startDate, endDate: addDays(startDate, 6) };
	}

	const [year, month] = date.split("-").map(Number);
	// 0-based month where the cycle starts: this one, or the previous if its start day hasn't come yet.
	const startMonth = dayInMonth(year, month - 1, startDay) > date ? month - 2 : month - 1;
	const monthStart = dayInMonth(year, startMonth, startDay);
	const monthEnd = addDays(dayInMonth(year, startMonth + 1, startDay), -1);

	if (cadence === "monthly") return { startDate: monthStart, endDate: monthEnd };

	// Two halves: 15 days, then the rest of the month (13–16 days).
	const secondHalf = addDays(monthStart, 15);
	return date >= secondHalf
		? { startDate: secondHalf, endDate: monthEnd }
		: { startDate: monthStart, endDate: addDays(monthStart, 14) };
}

// Shorter than half a period, a stretch left by a changed start day joins the period that follows.
const MIN_CYCLE_DAYS: Record<Cadence, number> = { monthly: 15, biweekly: 7, weekly: 4 };

/** The cycle that begins on `startDate` under this plan. */
export function getNextCycleRange(cadence: Cadence, startDay: CycleStartDay, startDate: string) {
	const { endDate } = getCycleRange(cadence, startDay, startDate);
	if (daysBetween(startDate, endDate) + 1 >= MIN_CYCLE_DAYS[cadence]) return { startDate, endDate };
	return { startDate, endDate: getCycleRange(cadence, startDay, addDays(endDate, 1)).endDate };
}

/** First cycle after onboarding: from today to the day before the next payday. */
export function getFirstCycleRange(cadence: Cadence, startDay: CycleStartDay, today: string) {
	return { startDate: today, endDate: getCycleRange(cadence, startDay, today).endDate };
}

export function monthName(date: string): string {
	return MONTH_NAMES[Number(date.split("-")[1]) - 1];
}

/** "sáb 28 nov". */
export function formatWeekdayDay(date: string): string {
	return `${WEEKDAYS[new Date(toUtc(date)).getUTCDay()]} ${formatDay(date)}`;
}

/** "16 nov 2026". */
export function formatFullDay(date: string): string {
	return `${formatDay(date)} ${date.slice(0, 4)}`;
}

/** The month `delta` months from `month` ("2026-11" and 3 is "2027-02"; negative goes back). */
export function shiftMonth(month: string, delta: number): string {
	const [year, monthNumber] = month.split("-").map(Number);
	return dayInMonth(year, monthNumber - 1 + delta, 1).slice(0, 7);
}

export type MonthCell = {
	month: string;
	/** "ene" to "dic". */
	short: string;
	/** "marzo 2027". */
	label: string;
	/** A month before this one: it cannot be chosen. */
	past: boolean;
	current: boolean;
	selected: boolean;
};

/** The 12 months of `year` for a month picker: which are past, which is this one and which is chosen. */
export function monthsOfYear(year: number, today: string, selected: string): MonthCell[] {
	const thisMonth = today.slice(0, 7);
	return MONTHS.map((short, index) => {
		const month = `${year}-${String(index + 1).padStart(2, "0")}`;
		return {
			month,
			short,
			label: formatMonthYear(month),
			past: month < thisMonth,
			current: month === thisMonth,
			selected: month === selected,
		};
	});
}

/** "marzo 2027" for "2027-03". */
export function formatMonthYear(month: string): string {
	return `${monthName(month)} ${month.slice(0, 4)}`;
}

/** The calendar works with local Dates: "2026-11-16" at local midnight, and back. */
export function parseLocalDate(date: string): Date {
	const [year, month, day] = date.split("-").map(Number);
	return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDay(date: string): string {
	const [, month, day] = date.split("-").map(Number);
	return `${day} ${MONTHS[month - 1]}`;
}

/** A past day, with its year only when it is not this year's: "22 jul" or "31 dic 2026". */
export function formatPastDay(date: string, today: string): string {
	const year = date.slice(0, 4);
	return year === today.slice(0, 4) ? formatDay(date) : `${formatDay(date)} ${year}`;
}

export function formatDayHeading(date: string, today: string): string {
	const weekday = WEEKDAYS[new Date(toUtc(date)).getUTCDay()] ?? "";
	if (date === today) return `Hoy · ${weekday} ${formatDay(date)}`;
	if (date === addDays(today, -1)) return `Ayer · ${weekday} ${formatDay(date)}`;
	return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDay(date)}`;
}

export function formatRange(startDate: string, endDate: string): string {
	return `${formatDay(startDate)} → ${formatDay(endDate)}`;
}

/** A range with its year: "1 sep → 30 sep 2026", or both years when it crosses one. */
export function formatRangeWithYear(startDate: string, endDate: string): string {
	const startYear = startDate.slice(0, 4);
	const endYear = endDate.slice(0, 4);
	return startYear === endYear
		? `${formatRange(startDate, endDate)} ${endYear}`
		: `${formatDay(startDate)} ${startYear} → ${formatDay(endDate)} ${endYear}`;
}

/** How a recent movement dates itself: "hoy", "ayer", a weekday inside the week, else "12 oct". */
export function formatRecentDay(date: string, today: string): string {
	const daysAgo = daysBetween(date, today);
	if (daysAgo <= 0) return "hoy";
	if (daysAgo === 1) return "ayer";
	if (daysAgo < 7) return WEEKDAYS[new Date(toUtc(date)).getUTCDay()] ?? "";
	return formatPastDay(date, today);
}

export function formatDaysLeft(days: number): string {
	return days === 1 ? "queda 1 día" : `quedan ${days} días`;
}
