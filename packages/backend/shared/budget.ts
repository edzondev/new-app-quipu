import type { Infer } from "convex/values";
import * as z from "zod/mini";
import type { amounts, envelope } from "../convex/schema";
import type { Split } from "./plan";

export type Envelope = Infer<typeof envelope>;
export type EnvelopeAmounts = Infer<typeof amounts>;

export const ZERO_AMOUNTS: EnvelopeAmounts = {
	needsCents: 0,
	wantsCents: 0,
	savingsCents: 0,
};

export const AMOUNT_KEYS = {
	needs: "needsCents",
	wants: "wantsCents",
	savings: "savingsCents",
} as const satisfies Record<Envelope, keyof EnvelopeAmounts>;

export const ENVELOPE_LABELS: Record<Envelope, string> = {
	needs: "Necesidades",
	wants: "Gustos",
	savings: "Ahorro",
};

export const NOTE_MAX_LENGTH = 40;
export const NAME_MAX_LENGTH = 40;

export const centsSchema = z.int().check(z.positive());
export const centsAtMost = (max: number) => centsSchema.check(z.maximum(max));
/** One movement (expense, income, contribution, saving, withdrawal): at most S/ 1 000 000. */
export const MAX_MOVEMENT_CENTS = 100_000_000;
export const movementCentsSchema = centsSchema.check(z.maximum(MAX_MOVEMENT_CENTS));
export const nameSchema = z.string().check(z.trim(), z.minLength(1), z.maxLength(NAME_MAX_LENGTH));
/** An absent or blank note is stored as no note. */
export const noteSchema = z.optional(
	z.pipe(
		z.string().check(z.trim(), z.maxLength(NOTE_MAX_LENGTH)),
		z.transform((note) => note || undefined),
	),
);

const moneyFormat = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function toCents(raw: string): number {
	// A trailing comma with 1–2 digits is the decimal mark ("12,50"). Any other comma groups thousands.
	const decimalComma = !raw.includes(".") && /,\d{1,2}$/.test(raw);
	const normalized = decimalComma
		? raw.replace(/,(\d{1,2})$/, ".$1").replace(/,/g, "")
		: raw.replace(/,/g, "");
	const value = Number(normalized);
	return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

export function formatCents(cents: number): string {
	return moneyFormat.format(cents / 100);
}

export function sumAmounts(amounts: EnvelopeAmounts): number {
	return amounts.needsCents + amounts.wantsCents + amounts.savingsCents;
}

// Floor wants and savings; Needs absorbs the leftover so the three always sum to incomeCents.
export function splitIncome(incomeCents: number, split: Split): EnvelopeAmounts {
	const share = (percent: number) => Math.floor((incomeCents * percent) / 100);
	const wantsCents = share(split.wants);
	const savingsCents = share(split.savings);
	return { needsCents: incomeCents - wantsCents - savingsCents, wantsCents, savingsCents };
}

export function addAmounts(base: EnvelopeAmounts, delta: EnvelopeAmounts): EnvelopeAmounts {
	return {
		needsCents: base.needsCents + delta.needsCents,
		wantsCents: base.wantsCents + delta.wantsCents,
		savingsCents: base.savingsCents + delta.savingsCents,
	};
}

export function subtractAmounts(base: EnvelopeAmounts, delta: EnvelopeAmounts): EnvelopeAmounts {
	return {
		needsCents: base.needsCents - delta.needsCents,
		wantsCents: base.wantsCents - delta.wantsCents,
		savingsCents: base.savingsCents - delta.savingsCents,
	};
}

// A new income adds only its own share under the current split; free money already there stays.
export function applyIncome(
	envelopes: EnvelopeAmounts,
	amountCents: number,
	split: Split,
	toSavings = false,
): { envelopes: EnvelopeAmounts; allocation: EnvelopeAmounts } {
	const allocation = toSavings
		? { ...ZERO_AMOUNTS, savingsCents: amountCents }
		: splitIncome(amountCents, split);
	return { envelopes: addAmounts(envelopes, allocation), allocation };
}

export function freeAmounts(
	envelopes: EnvelopeAmounts,
	spent: EnvelopeAmounts,
	reserved: EnvelopeAmounts,
): EnvelopeAmounts {
	return subtractAmounts(envelopes, addAmounts(spent, reserved));
}

// Only positive free money is redistributed; a negative free envelope keeps its deficit.
export function reallocateFree(
	envelopes: EnvelopeAmounts,
	spent: EnvelopeAmounts,
	reserved: EnvelopeAmounts,
	split: Split,
): EnvelopeAmounts {
	const free = freeAmounts(envelopes, spent, reserved);
	const positive: EnvelopeAmounts = {
		needsCents: Math.max(0, free.needsCents),
		wantsCents: Math.max(0, free.wantsCents),
		savingsCents: Math.max(0, free.savingsCents),
	};
	return addAmounts(subtractAmounts(envelopes, positive), splitIncome(sumAmounts(positive), split));
}

/**
 * Today's number. `freeCents` is Needs + Wants minus pending commitments, after today's spending.
 * The base is what was free when the day began over the days left, so it holds still while you spend.
 * `tomorrowCents` is null on the last day, when there is no tomorrow.
 */
export function getDailyBudget({
	freeCents,
	spentTodayCents,
	daysLeft,
}: {
	freeCents: number;
	spentTodayCents: number;
	daysLeft: number;
}) {
	const baseCents =
		daysLeft < 1 ? 0 : Math.floor(Math.max(0, freeCents + spentTodayCents) / daysLeft);
	return {
		baseCents,
		leftCents: Math.max(0, baseCents - spentTodayCents),
		overCents: Math.max(0, spentTodayCents - baseCents),
		tomorrowCents: daysLeft > 1 ? Math.floor(Math.max(0, freeCents) / (daysLeft - 1)) : null,
	};
}
