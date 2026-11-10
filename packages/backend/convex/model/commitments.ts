import { type CommitmentPayment, getOccurrences, type Schedule } from "../../shared/commitments";
import { getLimaDate } from "../../shared/dates";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const PAYMENTS_CAP = 500;

/** The schedule of a row, whether it has a rule or only the old `dueDay`. */
export function scheduleOf(row: Doc<"commitments">): Schedule {
	if (row.frequency === "once") return { frequency: "once", dueDate: row.dueDate };
	return {
		frequency: "monthly",
		rule: "rule" in row ? row.rule : { kind: "day", day: row.dueDay },
		adjustment: row.adjustment,
	};
}

/** A commitment's payments in every cycle. A payment settles the oldest open occurrence, so the count drives the states. */
export function getCommitmentPayments(ctx: QueryCtx | MutationCtx, row: Doc<"commitments">) {
	return ctx.db
		.query("transactions")
		.withIndex("by_commitmentId", (q) => q.eq("commitmentId", row._id))
		.take(PAYMENTS_CAP);
}

/** What the states need from a commitment's payments: the month each one covers, if it says. */
export function toCommitmentPayments(rows: Doc<"transactions">[]): CommitmentPayment[] {
	return rows.map((row) => ({ forMonth: row.kind === "expense" ? row.forMonth : undefined }));
}

export function getCommitmentStates(
	row: Doc<"commitments">,
	payments: Doc<"transactions">[],
	today: string,
	cycleEnd: string,
) {
	return getOccurrences(
		scheduleOf(row),
		getLimaDate(new Date(row._creationTime)),
		toCommitmentPayments(payments),
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
	return getCommitmentStates(row, payments, today, cycleEnd);
}
