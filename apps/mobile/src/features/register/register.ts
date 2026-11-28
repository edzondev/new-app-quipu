import type { api } from "@quipu/backend/convex/_generated/api";
import {
	AMOUNT_KEYS,
	applyIncome,
	type Envelope,
	ENVELOPE_LABELS,
	formatCents,
	getDailyBudget,
	MAX_MOVEMENT_CENTS,
	wholeSoles,
} from "@quipu/backend/shared/budget";
import { cycleNames, formatDay } from "@quipu/backend/shared/dates";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

export type MovementKind = "expense" | "income" | "contribution";

export const NOUNS: Record<MovementKind, string> = {
	expense: "gasto",
	income: "ingreso",
	contribution: "aporte",
};

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
type Change = { amountCents: number; originalCents: number; countsToday: boolean };

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

type Extra = NonNullable<FunctionArgs<typeof api.transactions.addIncome>["extra"]>;

export const INCOME_KINDS = ["Para este ciclo", "Extra"] as const;
export const DESTINATIONS = ["Sumar a mis sobres", "Directo a Ahorro"] as const;

const EXTRA_TYPE_LABELS: Record<Extra["type"], string> = {
	gratification: "Gratificación",
	bonus: "Bono",
	repayment: "Deuda que te devolvieron",
	other: "Otro",
};
export const EXTRA_TYPES = [
	"gratification",
	"bonus",
	"repayment",
	"other",
] as const satisfies readonly Extra["type"][];
export const EXTRA_TYPE_OPTIONS = EXTRA_TYPES.map((type) => EXTRA_TYPE_LABELS[type]);

export type IncomeDraft = {
	extra: Extra | null;
	forNextCycle: boolean;
};

export const INITIAL_INCOME: IncomeDraft = { extra: null, forNextCycle: true };

export const NEW_EXTRA: Extra = { type: "other", toSavings: false };

export function cycleChoices(endDate: string) {
	const names = cycleNames(endDate);
	return {
		prompt: `Tu ciclo termina el ${formatDay(endDate)}. ¿Para qué ciclo es este ingreso?`,
		options: [
			`Para ${names.current}`,
			`Para ${names.next}, desde el ${formatDay(names.nextStart)}`,
		],
		next: names.next,
	};
}

export type CycleChoices = ReturnType<typeof cycleChoices>;

export function saveLabel(cycles: CycleChoices | null, income: IncomeDraft): string {
	if (!cycles || !income.forNextCycle) return "Guardar";
	return `Guardar para ${cycles.next}`;
}

export const incomeSplitLine = (split: Home["split"]) =>
	`Se reparte ${split.needs} · ${split.wants} · ${split.savings} en tus sobres de este ciclo.`;

export const savingsLine = (home: Pick<Home, "savingsCents">, amountCents: number) =>
	`Tu número de hoy no cambia. Ahorro pasa a S/ ${wholeSoles(home.savingsCents + amountCents)}.`;

type IncomeHome = Pick<
	Home,
	| "leftCents"
	| "needsCents"
	| "wantsCents"
	| "savingsCents"
	| "pendingCents"
	| "daysLeft"
	| "spentTodayCents"
	| "split"
>;

export function incomeTodayLine(home: IncomeHome, amountCents: number): string | null {
	if (amountCents <= 0) return null;
	const { envelopes } = applyIncome(home, amountCents, home.split);
	const after = getDailyBudget({
		freeCents: envelopes.needsCents + envelopes.wantsCents - home.pendingCents,
		spentTodayCents: home.spentTodayCents,
		daysLeft: home.daysLeft,
	});
	return todayLine(home.leftCents, after.leftCents);
}

/** Only a new «Para este ciclo» income, in the last days of the cycle, asks which cycle it is for. */
export function canAddEarlySalary({
	isNew,
	extra,
	earlyWindow,
}: {
	isNew: boolean;
	extra: IncomeDraft["extra"];
	earlyWindow: boolean;
}): boolean {
	return isNew && extra === null && earlyWindow;
}
