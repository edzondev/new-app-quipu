import * as z from "zod/mini";
import type { Cadence, CycleStartDay } from "./plan";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = "ene feb mar abr may jun jul ago set oct nov dic".split(" ");
const WEEKDAYS = "dom lun mar mié jue vie sáb".split(" ");
const limaDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

export function getLimaDate(now = new Date()): string {
	return limaDateFormat.format(now);
}

export const isoDateSchema = z.iso.date();

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

const EARLY_INCOME_DAYS = 3;

/** The last 3 days of a cycle, today included. A cycle income registered then is the next cycle's. */
export function isEarlyIncomeWindow(today: string, endDate: string): boolean {
	return daysBetween(today, endDate) < EARLY_INCOME_DAYS;
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

/** First cycle after onboarding: from today to the day before the next payday. */
export function getFirstCycleRange(cadence: Cadence, startDay: CycleStartDay, today: string) {
	return { startDate: today, endDate: getCycleRange(cadence, startDay, today).endDate };
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
