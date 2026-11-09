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
	const { needsCents, wantsCents } = cycle.envelopes;
	const addsUp =
		assigned.needsCents - spent.needsCents === needsCents &&
		assigned.wantsCents - spent.wantsCents === wantsCents;
	return addsUp ? { status: "ok", assigned, spent, fundedCents } : { status: "inconsistent" };
}
