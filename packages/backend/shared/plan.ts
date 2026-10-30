import type { Infer } from "convex/values";
import type { plan } from "../convex/schema";

export type Plan = Infer<typeof plan>;
export type Cadence = Plan["cadence"];
export type CycleStartDay = Plan["cycleStartDay"];
export type Split = Plan["split"];

// Months without day 31 clamp in dayInMonth; "last" covers end of month.
export const MAX_MONTH_DAY = 31;

export function parseStartDay(raw: string): CycleStartDay {
	return raw === "last" ? "last" : Number(raw);
}

export function isValidStartDay(cadence: Cadence, day: CycleStartDay): boolean {
	if (day === "last") return cadence !== "weekly";
	const [min, max] = cadence === "weekly" ? [0, 6] : [1, MAX_MONTH_DAY];
	return Number.isInteger(day) && day >= min && day <= max;
}

export function isValidSplit({ needs, wants, savings }: Split): boolean {
	return (
		[needs, wants, savings].every((p) => p >= 0 && p <= 100) &&
		Math.round((needs + wants + savings) * 100) === 10000
	);
}

export function isValidPlan({ cadence, cycleStartDay, incomeCents, split }: Plan): boolean {
	return (
		Number.isSafeInteger(incomeCents) &&
		incomeCents > 0 &&
		isValidStartDay(cadence, cycleStartDay) &&
		isValidSplit(split)
	);
}
