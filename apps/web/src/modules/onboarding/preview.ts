import type { Cadence, Split } from "#/modules/onboarding/schemas";

const MONTHS = "ene feb mar abr may jun jul ago set oct nov dic".split(" ");
const DAY_MS = 24 * 60 * 60 * 1000;

const moneyFormat = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const limaDateFormat = new Intl.DateTimeFormat("en-CA", {
	timeZone: "America/Lima",
});

export function toCents(raw: string): number {
	const value = Number(raw.replace(/,/g, ""));
	return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

export function formatCents(cents: number): string {
	return moneyFormat.format(cents / 100);
}

export function formatShortDate(date: Date): string {
	return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function getLimaToday(now = new Date()): Date {
	const [year, month, day] = limaDateFormat.format(now).split("-").map(Number);
	return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function daysBetween(from: Date, to: Date): number {
	return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function dayInMonth(year: number, month: number, startDay: string): Date {
	const lastDay = new Date(year, month + 1, 0).getDate();
	const day = startDay === "last" ? lastDay : Math.min(Number(startDay), lastDay);
	return new Date(year, month, day);
}

export function getCycle(cadence: Cadence, startDay: string, today: Date) {
	if (cadence === "weekly") {
		const weekday = Number(startDay) % 7;
		const start = addDays(today, -((today.getDay() - weekday + 7) % 7));
		return { start, end: addDays(start, 6) };
	}

	const year = today.getFullYear();
	const month = today.getMonth();
	const thisMonth = dayInMonth(year, month, startDay);
	const monthStart = thisMonth > today ? dayInMonth(year, month - 1, startDay) : thisMonth;
	const nextMonthStart = dayInMonth(monthStart.getFullYear(), monthStart.getMonth() + 1, startDay);
	const monthEnd = addDays(nextMonthStart, -1);

	if (cadence === "monthly") return { start: monthStart, end: monthEnd };

	const start = addDays(monthStart, Math.floor(daysBetween(monthStart, today) / 15) * 15);
	let end = addDays(start, 14);
	if (end > monthEnd) end = monthEnd;
	return { start, end };
}

export function getPreview({
	incomeCents,
	commitmentsCents,
	split,
	cycleEnd,
	today,
}: {
	incomeCents: number;
	commitmentsCents: number;
	split: Split;
	cycleEnd: Date;
	today: Date;
}) {
	const toDistribute = Math.max(0, incomeCents - commitmentsCents);
	const needs = Math.round((toDistribute * split.needs) / 100);
	const wants = Math.round((toDistribute * split.wants) / 100);
	const savings = toDistribute - needs - wants;
	const daysLeft = Math.max(1, daysBetween(today, cycleEnd) + 1);
	return {
		needs,
		wants,
		savings,
		dailyCents: Math.round((needs + wants) / daysLeft),
	};
}

export function getCommitmentsCents(commitments: { amount: string }[]): number {
	return commitments.reduce((sum, { amount }) => sum + toCents(amount), 0);
}
