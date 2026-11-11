import {
	AMOUNT_KEYS,
	addAmounts,
	type EnvelopeAmounts,
	getDailyBudget,
	sumAmounts,
	ZERO_AMOUNTS,
} from "../../shared/budget";
import { isReserved } from "../../shared/commitments";
import { daysBetween } from "../../shared/dates";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getCommitmentOccurrences } from "./commitments";

/**
 * Money held back per envelope for commitments still due this cycle (overdue, upcoming or reserved).
 * A paid occurrence is not held: its payment already left the envelope.
 */
export async function getReserved(
	ctx: QueryCtx | MutationCtx,
	spaceId: Doc<"spaces">["_id"],
	cycleEnd: string,
	today: string,
): Promise<EnvelopeAmounts> {
	const rows = await ctx.db
		.query("commitments")
		.withIndex("by_spaceId", (q) => q.eq("spaceId", spaceId))
		.take(100);
	const held = await Promise.all(
		rows.map(async (row) => {
			const occurrences = await getCommitmentOccurrences(ctx, row, today, cycleEnd);
			const dueCount = occurrences.filter(({ status }) => isReserved(status)).length;
			return { ...ZERO_AMOUNTS, [AMOUNT_KEYS[row.envelope]]: row.amountCents * dueCount };
		}),
	);
	return held.reduce(addAmounts, ZERO_AMOUNTS);
}

export function assignedChange(tx: Doc<"transactions">, cycleId: Id<"cycles">): EnvelopeAmounts {
	if (tx.kind === "income") return tx.forNextCycle ? ZERO_AMOUNTS : tx.allocation;
	if (tx.kind !== "contribution") return ZERO_AMOUNTS;
	return tx.toCycleId === cycleId
		? { ...ZERO_AMOUNTS, [AMOUNT_KEYS[tx.toEnvelope]]: tx.amountCents }
		: { ...ZERO_AMOUNTS, [AMOUNT_KEYS[tx.envelope]]: -tx.amountCents };
}

export function receivedAportes(ctx: QueryCtx | MutationCtx, cycleId: Id<"cycles">, cap: number) {
	return ctx.db
		.query("transactions")
		.withIndex("by_toCycleId", (q) => q.eq("toCycleId", cycleId))
		.take(cap);
}

/** The day's number and what feeds it. Shared by every read of the live budget. */
export async function getDayBudget(
	ctx: QueryCtx,
	spaceId: Doc<"spaces">["_id"],
	cycle: Doc<"cycles">,
	today: string,
) {
	const { needsCents, wantsCents, savingsCents } = cycle.envelopes;

	const [reserved, cycleTx, received] = await Promise.all([
		getReserved(ctx, spaceId, cycle.endDate, today),
		ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.take(500),
		receivedAportes(ctx, cycle._id, 500),
	]);
	const hasIncome =
		received.length > 0 || cycleTx.some((tx) => tx.kind === "income" && !tx.forNextCycle);
	const earlyCents = cycleTx.reduce(
		(sum, tx) => (tx.kind === "income" && tx.forNextCycle ? sum + tx.amountCents : sum),
		0,
	);

	const daysLeft = Math.max(0, daysBetween(today, cycle.endDate) + 1);
	// A negative carry is debt the cycle absorbs, not money assigned to it.
	const carried = {
		needsCents: Math.max(0, cycle.carryIn.needsCents),
		wantsCents: Math.max(0, cycle.carryIn.wantsCents),
		savingsCents: 0,
	};
	const assigned = [...cycleTx, ...received].reduce(
		(sum, tx) => addAmounts(sum, assignedChange(tx, cycle._id)),
		carried,
	);
	const pendingCents = sumAmounts(reserved);
	// A commitment payment was already held back as pending, so it is not today's spending.
	const spentTodayCents = cycleTx.reduce(
		(sum, tx) =>
			tx.kind === "expense" && !("commitmentId" in tx) && tx.date === today
				? sum + tx.amountCents
				: sum,
		0,
	);
	const { baseCents, ...daily } = getDailyBudget({
		freeCents: needsCents + wantsCents - pendingCents,
		spentTodayCents,
		daysLeft,
	});

	return {
		needsCents,
		wantsCents,
		savingsCents,
		assigned,
		dailyCents: baseCents,
		spentTodayCents,
		...daily,
		daysLeft,
		pendingCents,
		reserved,
		hasIncome,
		earlyCents,
	};
}
