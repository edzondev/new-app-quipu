import { getOccurrences } from "../../shared/commitments";
import { getLimaDate } from "../../shared/dates";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const PAYMENTS_CAP = 500;

/** A commitment's payments in every cycle. A payment settles the oldest open occurrence, so the count drives the states. */
export function getCommitmentPayments(ctx: QueryCtx | MutationCtx, row: Doc<"commitments">) {
	return ctx.db
		.query("transactions")
		.withIndex("by_commitmentId", (q) => q.eq("commitmentId", row._id))
		.take(PAYMENTS_CAP);
}

export function getCommitmentStates(
	row: Doc<"commitments">,
	paymentCount: number,
	today: string,
	cycleEnd: string,
) {
	return getOccurrences(
		row,
		getLimaDate(new Date(row._creationTime)),
		paymentCount,
		today,
		cycleEnd,
	);
}

/** Every occurrence of a commitment up to the cycle end, with its state. Shared by the day's number and markPaid. */
export async function getCommitmentOccurrences(
	ctx: QueryCtx | MutationCtx,
	row: Doc<"commitments">,
	today: string,
	cycleEnd: string,
) {
	const payments = await getCommitmentPayments(ctx, row);
	return getCommitmentStates(row, payments.length, today, cycleEnd);
}
