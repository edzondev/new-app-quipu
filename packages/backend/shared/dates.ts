import type { Cadence, CycleStartDay } from "./plan";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = "ene feb mar abr may jun jul ago set oct nov dic".split(" ");
const limaDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

export function getLimaDate(now = new Date()): string {
	return limaDateFormat.format(now);
}

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

export function formatDay(date: string): string {
	const [, month, day] = date.split("-").map(Number);
	return `${day} ${MONTHS[month - 1]}`;
}

export function formatRange(startDate: string, endDate: string): string {
	return `${formatDay(startDate)} → ${formatDay(endDate)}`;
}
