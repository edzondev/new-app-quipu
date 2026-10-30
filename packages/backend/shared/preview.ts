import { getDailyCents, splitIncome } from "./budget";
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
	const { needs, wants, savings } = splitIncome(incomeCents, split);
	const daysLeft = Math.max(0, daysBetween(today, cycleEnd) + 1);
	const pendingCents = getPendingCents(commitments, today, cycleEnd);
	return {
		needs,
		wants,
		savings,
		dailyCents: getDailyCents(needs + wants - pendingCents, daysLeft),
	};
}
