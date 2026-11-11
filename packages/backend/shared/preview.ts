import {
	type EnvelopeAmounts,
	getDailyBudget,
	reallocateFree,
	splitIncome,
	sumAmounts,
	ZERO_AMOUNTS,
} from "./budget";
import { getPendingCents, type MonthlyCommitment } from "./commitments";
import { daysBetween } from "./dates";
import type { Split } from "./plan";

// Same account as Inicio: the whole income is split, and only commitments still due this cycle
// reduce the daily number.
export function getPreview({
	incomeCents,
	commitments,
	split,
	cycleEnd,
	today,
}: {
	incomeCents: number;
	commitments: MonthlyCommitment[];
	split: Split;
	cycleEnd: string;
	today: string;
}) {
	const { needsCents, wantsCents, savingsCents } = splitIncome(incomeCents, split);
	const daysLeft = Math.max(0, daysBetween(today, cycleEnd) + 1);
	const pendingCents = getPendingCents(commitments, today, cycleEnd);
	return {
		needsCents,
		wantsCents,
		savingsCents,
		dailyCents: getDailyBudget({
			freeCents: needsCents + wantsCents - pendingCents,
			spentTodayCents: 0,
			daysLeft,
		}).baseCents,
	};
}

// What Ajustes shows before saving a new split. The same `reallocateFree` updateSplit runs, so the
// envelopes and the daily number match what Inicio shows after saving.
export function getSplitPreview({
	envelopes,
	reserved,
	split,
	spentTodayCents,
	daysLeft,
}: {
	envelopes: EnvelopeAmounts;
	reserved: EnvelopeAmounts;
	split: Split;
	spentTodayCents: number;
	daysLeft: number;
}) {
	const next = reallocateFree(envelopes, ZERO_AMOUNTS, reserved, split);
	return {
		envelopes: next,
		leftCents: getDailyBudget({
			freeCents: next.needsCents + next.wantsCents - sumAmounts(reserved),
			spentTodayCents,
			daysLeft,
		}).leftCents,
	};
}
