import type { Infer } from "convex/values";
import { AMOUNT_KEYS } from "../../shared/budget";
import type { Doc } from "../_generated/dataModel";
import type { closeSummary } from "../schema";

export type CloseSummary = Infer<typeof closeSummary>;

/**
 * Adds up what entered (carry, income shares, fund withdrawals, split moves) and left (expenses)
 * Necesidades and Gustos from the cycle's own records. It only answers "ok" when that agrees with
 * the balance the cycle ended with, so an unrecorded flow is flagged instead of shown as fact.
 */
export function summarizeClose(
	cycle: Doc<"cycles">,
	rows: Doc<"transactions">[],
	fundedCents: number,
): CloseSummary {
	const moved = cycle.reallocated;
	const assigned = {
		needsCents: cycle.carryIn.needsCents + (moved?.needsCents ?? 0),
		wantsCents: cycle.carryIn.wantsCents + (moved?.wantsCents ?? 0),
	};
	const spent = { needsCents: 0, wantsCents: 0 };
	for (const row of rows) {
		if (row.kind === "income") {
			assigned.needsCents += row.allocation.needsCents;
			assigned.wantsCents += row.allocation.wantsCents;
		} else if (row.kind === "withdrawal") {
			assigned.needsCents += row.amountCents;
		} else if (row.kind === "expense") {
			spent[AMOUNT_KEYS[row.envelope]] += row.amountCents;
		}
	}
	// What the cycle ended with minus what its records explain: zero in both when it adds up.
	const gap = {
		needsCents: cycle.envelopes.needsCents - (assigned.needsCents - spent.needsCents),
		wantsCents: cycle.envelopes.wantsCents - (assigned.wantsCents - spent.wantsCents),
	};
	if (gap.needsCents === 0 && gap.wantsCents === 0) {
		return { status: "ok", assigned, spent, fundedCents };
	}
	// Never block the close. Only the id and the two amounts, nothing the person wrote.
	console.error("Cycle close summary does not add up", cycle._id, gap);
	return { status: "inconsistent" };
}
