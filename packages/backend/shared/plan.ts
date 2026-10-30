import type { Infer } from "convex/values";
import type { plan, split } from "../convex/schema";
import { isValidCents } from "./budget";

export type Plan = Infer<typeof plan>;
export type Split = Infer<typeof split>;
export type Cadence = Plan["cadence"];
export type CycleStartDay = Plan["cycleStartDay"];

// Months without day 31 clamp in dayInMonth; "last" covers end of month.
// Exported for the onboarding cycle day picker.
export const MAX_MONTH_DAY = 31;

export function parseStartDay(raw: string): CycleStartDay {
	return raw === "last" ? "last" : Number(raw);
}

export function isValidMonthDay(day: number): boolean {
	return Number.isInteger(day) && day >= 1 && day <= MAX_MONTH_DAY;
}

export function isValidStartDay(cadence: Cadence, day: CycleStartDay): boolean {
	if (day === "last") return cadence !== "weekly";
	if (cadence === "weekly") return Number.isInteger(day) && day >= 0 && day <= 6;
	return isValidMonthDay(day);
}

export function isValidSplit({ needs, wants, savings }: Split): boolean {
	return (
		[needs, wants, savings].every((p) => p >= 0 && p <= 100) &&
		Math.round((needs + wants + savings) * 100) === 10000
	);
}

export function isValidPlan({ cadence, cycleStartDay, incomeCents }: Plan): boolean {
	return isValidCents(incomeCents) && isValidStartDay(cadence, cycleStartDay);
}
