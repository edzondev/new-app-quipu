import type { Infer } from "convex/values";
import * as z from "zod/mini";
import type { plan, split } from "../convex/schema";
import { centsSchema } from "./budget";

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

export const monthDaySchema = z.int().check(z.minimum(1), z.maximum(MAX_MONTH_DAY));
const weekdaySchema = z.int().check(z.minimum(0), z.maximum(6));

export function isValidStartDay(cadence: Cadence, day: CycleStartDay): boolean {
	if (day === "last") return cadence !== "weekly";
	return (cadence === "weekly" ? weekdaySchema : monthDaySchema).safeParse(day).success;
}

const MONTH_FACTOR: Record<Cadence, { times: number; per: number }> = {
	monthly: { times: 1, per: 1 },
	biweekly: { times: 2, per: 1 },
	weekly: { times: 52, per: 12 },
};
const FUND_GOAL_MONTHS = 3;

/** Plan income x Needs share, taken to one month, times 3. Rounded down to the cent. */
export function suggestFundGoalCents(plan: Pick<Plan, "cadence" | "incomeCents">, split: Split) {
	const { times, per } = MONTH_FACTOR[plan.cadence];
	return Math.floor((plan.incomeCents * split.needs * times * FUND_GOAL_MONTHS) / (100 * per));
}

export function isValidSplit({ needs, wants, savings }: Split): boolean {
	return (
		[needs, wants, savings].every((p) => p >= 0 && p <= 100) &&
		Math.round((needs + wants + savings) * 100) === 10000
	);
}

export function isValidPlan({ cadence, cycleStartDay, incomeCents }: Plan): boolean {
	return centsSchema.safeParse(incomeCents).success && isValidStartDay(cadence, cycleStartDay);
}
