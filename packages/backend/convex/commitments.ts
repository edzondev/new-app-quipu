import { ConvexError, type Infer, v } from "convex/values";
import { AMOUNT_KEYS, centsSchema, nameSchema } from "../shared/budget";
import {
	type CommitmentStatus,
	getNextDueDate,
	isReserved,
	type Occurrence,
} from "../shared/commitments";
import { isoDateSchema } from "../shared/dates";
import { monthDaySchema } from "../shared/plan";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import {
	getCommitmentOccurrences,
	getCommitmentPayments,
	getCommitmentStates,
} from "./model/commitments";
import { requireOpenCycle } from "./model/cycles";
import { parseInput } from "./model/input";
import { requireSpace, type SpaceKind } from "./model/spaces";
import { spaceKind, spendable } from "./schema";

const NOT_FOUND = "No encontramos este dato.";
const ALREADY_PAID = "Este compromiso ya está pagado en este ciclo.";
const COMMITMENTS_CAP = 100;

const schedule = v.union(
	v.object({
		frequency: v.literal("monthly"),
		dueDay: v.number(),
	}),
	v.object({
		frequency: v.literal("once"),
		dueDate: v.string(),
	}),
);
type Schedule = Infer<typeof schedule>;

async function requireOwnCommitment(ctx: MutationCtx, kind: SpaceKind, id: Id<"commitments">) {
	const { userId, space } = await requireSpace(ctx, kind);
	const row = await ctx.db.get("commitments", id);
	if (!row || row.spaceId !== space._id) throw new ConvexError(NOT_FOUND);
	return { userId, space, row };
}

function buildRow(
	spaceId: Id<"spaces">,
	name: string,
	amountCents: number,
	envelope: "needs" | "wants",
	when: Schedule,
) {
	if (when.frequency === "monthly") {
		parseInput(monthDaySchema, when.dueDay);
		return {
			spaceId,
			name,
			amountCents,
			envelope,
			frequency: "monthly" as const,
			dueDay: when.dueDay,
		};
	}
	parseInput(isoDateSchema, when.dueDate);
	return {
		spaceId,
		name,
		amountCents,
		envelope,
		frequency: "once" as const,
		dueDate: when.dueDate,
	};
}

export const add = mutation({
	args: {
		space: spaceKind,
		name: v.string(),
		amountCents: v.number(),
		envelope: spendable,
		schedule,
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, name, amountCents, envelope, schedule: when }) => {
		const { space } = await requireSpace(ctx, kind);
		parseInput(centsSchema, amountCents);
		await ctx.db.insert(
			"commitments",
			buildRow(space._id, parseInput(nameSchema, name), amountCents, envelope, when),
		);
		return null;
	},
});

export const update = mutation({
	args: {
		space: spaceKind,
		id: v.id("commitments"),
		name: v.string(),
		amountCents: v.number(),
		envelope: spendable,
		schedule,
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, id, name, amountCents, envelope, schedule: when }) => {
		const { row } = await requireOwnCommitment(ctx, kind, id);
		parseInput(centsSchema, amountCents);
		await ctx.db.replace(
			"commitments",
			row._id,
			buildRow(row.spaceId, parseInput(nameSchema, name), amountCents, envelope, when),
		);
		return null;
	},
});

/** `delete` is reserved in JS; callers use api.commitments.remove. */
export const remove = mutation({
	args: { space: spaceKind, id: v.id("commitments") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		await requireOwnCommitment(ctx, kind, id);
		await ctx.db.delete("commitments", id);
		return null;
	},
});

const listItem = {
	id: v.id("commitments"),
	name: v.string(),
	amountCents: v.number(),
	envelope: spendable,
	frequency: v.union(v.literal("monthly"), v.literal("once")),
	dueDate: v.string(),
};

type Charge =
	| { status: "paid"; dueDate: string; paidOn: string; amountCents: number }
	| { status: Exclude<CommitmentStatus, "paid">; dueDate: string };

/**
 * The charge a commitment shows: its oldest open one. With none open, a monthly shows its next
 * charge, and a one-off paid in an earlier cycle shows as paid, with what was paid. A one-off
 * paid in this cycle has no row: its payment is listed in `payments`.
 */
function pickCharge(
	row: Doc<"commitments">,
	occurrences: Occurrence[],
	payments: Doc<"transactions">[],
	cycle: Doc<"cycles">,
): Charge | undefined {
	const open = occurrences.find(({ status }) => status !== "paid");
	if (open && open.status !== "paid") return { dueDate: open.dueDate, status: open.status };
	if (row.frequency === "monthly") {
		return { dueDate: getNextDueDate(row, cycle.endDate), status: "later" };
	}
	const payment = payments[0];
	if (!payment || payment.cycleId === cycle._id) return undefined;
	return {
		dueDate: row.dueDate,
		status: "paid",
		paidOn: payment.date,
		amountCents: payment.amountCents,
	};
}

/** One row per commitment, plus every payment made this cycle. Totals follow the day's number. */
export const list = query({
	args: { space: spaceKind, today: v.string() },
	returns: v.object({
		payableCents: v.number(),
		paidCents: v.number(),
		items: v.array(
			v.union(
				// A paid row shows what was paid, so `amountCents` here is the payment's.
				v.object({
					...listItem,
					status: v.literal("paid"),
					paidOn: v.string(),
				}),
				v.object({
					...listItem,
					status: v.union(
						v.literal("overdue"),
						v.literal("upcoming"),
						v.literal("reserved"),
						v.literal("later"),
					),
				}),
			),
		),
		payments: v.array(
			v.object({
				paymentId: v.id("transactions"),
				id: v.id("commitments"),
				name: v.string(),
				envelope: spendable,
				amountCents: v.number(),
				paidOn: v.string(),
				dueDate: v.string(),
			}),
		),
	}),
	handler: async (ctx, { space: kind, today }) => {
		parseInput(isoDateSchema, today);
		const { space, cycle } = await requireOpenCycle(ctx, kind, today);
		const rows = await ctx.db
			.query("commitments")
			.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
			.take(COMMITMENTS_CAP);
		const charges = await Promise.all(
			rows.map(async (row) => {
				const payments = await getCommitmentPayments(ctx, row);
				const occurrences = getCommitmentStates(row, payments.length, today, cycle.endDate);
				// Each payment settled the oldest open occurrence, so payment i settled occurrence i.
				const cyclePayments = payments.flatMap((tx, index) =>
					tx.cycleId === cycle._id
						? [
								{
									paymentId: tx._id,
									id: row._id,
									name: row.name,
									envelope: row.envelope,
									amountCents: tx.amountCents,
									paidOn: tx.date,
									dueDate: occurrences[index]?.dueDate ?? tx.date,
								},
							]
						: [],
				);
				return {
					row,
					charge: pickCharge(row, occurrences, payments, cycle),
					reservedCount: occurrences.filter(({ status }) => isReserved(status)).length,
					cyclePayments,
				};
			}),
		);
		const items = charges
			.flatMap(({ row, charge }) =>
				charge
					? [
							{
								id: row._id,
								name: row.name,
								amountCents: row.amountCents,
								envelope: row.envelope,
								frequency: row.frequency,
								...charge,
							},
						]
					: [],
			)
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
		const payments = charges
			.flatMap(({ cyclePayments }) => cyclePayments)
			.sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.dueDate.localeCompare(b.dueDate));
		return {
			payableCents: charges.reduce(
				(sum, { row, reservedCount }) => sum + row.amountCents * reservedCount,
				0,
			),
			paidCents: payments.reduce((sum, { amountCents }) => sum + amountCents, 0),
			items,
			payments,
		};
	},
});

export const markPaid = mutation({
	args: {
		space: spaceKind,
		id: v.id("commitments"),
		amountCents: v.optional(v.number()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, id, amountCents }) => {
		const { userId, space, cycle, today } = await requireOpenCycle(ctx, kind);
		const row = await ctx.db.get("commitments", id);
		if (!row || row.spaceId !== space._id) throw new ConvexError(NOT_FOUND);

		const occurrences = await getCommitmentOccurrences(ctx, row, today, cycle.endDate);
		if (occurrences.every(({ status }) => status === "paid")) throw new ConvexError(ALREADY_PAID);

		const paidCents = amountCents ?? row.amountCents;
		parseInput(centsSchema, paidCents);

		const key = AMOUNT_KEYS[row.envelope];
		await ctx.db.insert("transactions", {
			kind: "expense",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents: paidCents,
			date: today,
			envelope: row.envelope,
			commitmentId: id,
		});
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: {
				...cycle.envelopes,
				[key]: cycle.envelopes[key] - paidCents,
			},
		});
		return null;
	},
});
