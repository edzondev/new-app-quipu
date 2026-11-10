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

/** A commitment's payments in every cycle. Each one settles the due date of its own month. */
export async function getCommitmentPayments(ctx: QueryCtx | MutationCtx, row: Doc<"commitments">) {
	const rows = await ctx.db
		.query("transactions")
		.withIndex("by_commitmentId", (q) => q.eq("commitmentId", row._id))
		.take(PAYMENTS_CAP);
	return rows.flatMap((tx) => (tx.kind === "expense" && "forMonth" in tx ? [tx] : []));
}

export function getCommitmentStates(
	row: Doc<"commitments">,
	payments: CommitmentPayment[],
	today: string,
	cycleEnd: string,
) {
	return getOccurrences(
		scheduleOf(row),
		getLimaDate(new Date(row._creationTime)),
		payments,
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
