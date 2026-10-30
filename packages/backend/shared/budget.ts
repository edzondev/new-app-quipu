import type { Split } from "./plan";

export type Envelope = "needs" | "wants" | "savings";
export type EnvelopeAmounts = Record<Envelope, number>;

const moneyFormat = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function toCents(raw: string): number {
	const value = Number(raw.replace(/,/g, ""));
	return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

export function formatCents(cents: number): string {
	return moneyFormat.format(cents / 100);
}

export function sumAmounts(amounts: EnvelopeAmounts): number {
	return amounts.needs + amounts.wants + amounts.savings;
}

// Floor each share; leftover cents go to Needs so the three always sum to incomeCents.
export function splitIncome(incomeCents: number, split: Split): EnvelopeAmounts {
	const needs = Math.floor((incomeCents * split.needs) / 100);
	const wants = Math.floor((incomeCents * split.wants) / 100);
	const savings = Math.floor((incomeCents * split.savings) / 100);
	const remainder = incomeCents - needs - wants - savings;
	return { needs: needs + remainder, wants, savings };
}

export function addAmounts(base: EnvelopeAmounts, delta: EnvelopeAmounts): EnvelopeAmounts {
	return {
		needs: base.needs + delta.needs,
		wants: base.wants + delta.wants,
		savings: base.savings + delta.savings,
	};
}

export function subtractAmounts(base: EnvelopeAmounts, delta: EnvelopeAmounts): EnvelopeAmounts {
	return {
		needs: base.needs - delta.needs,
		wants: base.wants - delta.wants,
		savings: base.savings - delta.savings,
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
	return {
		needs: envelopes.needs - spent.needs - reserved.needs,
		wants: envelopes.wants - spent.wants - reserved.wants,
		savings: envelopes.savings - spent.savings - reserved.savings,
	};
}

// Redistributes only the positive free money. Spent and reserved money keeps its envelope.
// A negative free envelope is not part of the pool: it keeps its deficit, so the overspent
// envelope stays visible, and then receives its share like the others.
export function reallocateFree(
	envelopes: EnvelopeAmounts,
	spent: EnvelopeAmounts,
	reserved: EnvelopeAmounts,
	split: Split,
): EnvelopeAmounts {
	const free = freeAmounts(envelopes, spent, reserved);
	const pool = splitIncome(
		Math.max(0, free.needs) + Math.max(0, free.wants) + Math.max(0, free.savings),
		split,
	);
	return {
		needs: spent.needs + reserved.needs + Math.min(0, free.needs) + pool.needs,
		wants: spent.wants + reserved.wants + Math.min(0, free.wants) + pool.wants,
		savings: spent.savings + reserved.savings + Math.min(0, free.savings) + pool.savings,
	};
}

// Daily number = free Needs + Wants minus pending commitments, over days left, floored.
export function getDailyCents(freeCents: number, daysLeft: number): number {
	if (daysLeft < 1) return 0;
	return Math.floor(Math.max(0, freeCents) / daysLeft);
}
