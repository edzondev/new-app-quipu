import { getOccurrences } from "../../shared/commitments";
import { getLimaDate } from "../../shared/dates";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const PAYMENTS_CAP = 500;

/** Every occurrence of a commitment up to the cycle end, with its state. Shared by the day's number, the list and markPaid. */
export async function getCommitmentOccurrences(
	ctx: QueryCtx | MutationCtx,
	row: Doc<"commitments">,
	today: string,
	cycleEnd: string,
) {
	const payments = await ctx.db
		.query("transactions")
		.withIndex("by_commitmentId", (q) => q.eq("commitmentId", row._id))
		.take(PAYMENTS_CAP);
	return getOccurrences(
		row,
		getLimaDate(new Date(row._creationTime)),
		payments.length,
		today,
		cycleEnd,
	);
}
