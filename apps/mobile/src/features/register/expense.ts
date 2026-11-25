import type { api } from "@quipu/backend/convex/_generated/api";
import {
	AMOUNT_KEYS,
	ENVELOPE_LABELS,
	formatCents,
	getDailyBudget,
	MAX_MOVEMENT_CENTS,
	type Envelope,
} from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";

type Home = FunctionReturnType<typeof api.balances.getHome>;

export type ExpenseEnvelope = Exclude<Envelope, "savings">;

export const EXPENSE_ENVELOPES = ["needs", "wants"] as const satisfies readonly ExpenseEnvelope[];

export const EXPENSE_ENVELOPE_LABELS = EXPENSE_ENVELOPES.map(
	(envelope) => ENVELOPE_LABELS[envelope],
);

export function canSaveAmount(amountCents: number): boolean {
	return amountCents > 0 && amountCents <= MAX_MOVEMENT_CENTS;
}

export function envelopeBalanceCents(
	home: Pick<Home, "needsCents" | "wantsCents">,
	envelope: ExpenseEnvelope,
): number {
	return Math.max(0, home[AMOUNT_KEYS[envelope]]);
}

export function todayLine(fromCents: number, toCents: number, label = "Hoy"): string {
	return `${label}: S/ ${formatCents(fromCents)} → S/ ${formatCents(toCents)}`;
}

type TodayHome = Pick<
	Home,
	"leftCents" | "needsCents" | "wantsCents" | "pendingCents" | "daysLeft" | "spentTodayCents"
>;

/**
 * What a movement takes from the free money. `originalCents` is what an edited one already took.
 * `countsToday` is false for what is not spent today: an older expense or an aporte.
 */
export type Change = { amountCents: number; originalCents: number; countsToday: boolean };

function dayAfter(home: TodayHome, { amountCents, originalCents, countsToday }: Change) {
	const changeCents = amountCents - originalCents;
	return getDailyBudget({
		freeCents: home.needsCents + home.wantsCents - home.pendingCents - changeCents,
		spentTodayCents: home.spentTodayCents + (countsToday ? changeCents : 0),
		daysLeft: home.daysLeft,
	});
}

export function expenseTodayLine(home: TodayHome, change: Change): string | null {
	if (change.amountCents <= 0) return null;
	const after = dayAfter(home, change);
	if (after.overCents > 0) return `Hoy te pasarás S/ ${formatCents(after.overCents)}`;
	return todayLine(home.leftCents, after.leftCents);
}

export function contributionTodayLine(home: TodayHome, change: Change): string | null {
	if (change.amountCents <= 0) return null;
	return todayLine(home.leftCents, dayAfter(home, change).leftCents, "Hoy en Personal");
}
