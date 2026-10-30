import type { Infer } from "convex/values";
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

export const NOTE_MAX_LENGTH = 40;

// Same cap as the onboarding form (one row per commitment kind).
export const MAX_ONBOARDING_COMMITMENTS = 5;

const moneyFormat = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function toCents(raw: string): number {
	const value = Number(raw.replace(/,/g, ""));
	return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

export function isValidCents(cents: number): boolean {
	return Number.isSafeInteger(cents) && cents > 0;
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
): { envelopes: EnvelopeAmounts; allocation: EnvelopeAmounts } {
	const allocation = splitIncome(amountCents, split);
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

// Daily number = free Needs + Wants minus pending commitments, over days left, floored.
export function getDailyCents(freeCents: number, daysLeft: number): number {
	if (daysLeft < 1) return 0;
	return Math.floor(Math.max(0, freeCents) / daysLeft);
}
