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

export function canSaveExpense(amountCents: number): boolean {
	return amountCents > 0 && amountCents <= MAX_MOVEMENT_CENTS;
}

export function envelopeBalanceCents(
	home: Pick<Home, "needsCents" | "wantsCents">,
	envelope: ExpenseEnvelope,
): number {
	return Math.max(0, home[AMOUNT_KEYS[envelope]]);
}

type TodayHome = Pick<
	Home,
	"leftCents" | "needsCents" | "wantsCents" | "pendingCents" | "daysLeft" | "spentTodayCents"
>;

/** «Hoy: S/ antes → S/ después». Null while the amount is empty or zero. */
export function expenseTodayLine(home: TodayHome, amountCents: number): string | null {
	if (amountCents <= 0) return null;
	const after = getDailyBudget({
		freeCents: home.needsCents + home.wantsCents - home.pendingCents - amountCents,
		spentTodayCents: home.spentTodayCents + amountCents,
		daysLeft: home.daysLeft,
	});
	return `Hoy: S/ ${formatCents(home.leftCents)} → S/ ${formatCents(after.leftCents)}`;
}
