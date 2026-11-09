import { ConvexError, type Infer, v } from "convex/values";
import { rowLabel } from "../shared/activity";
import { AMOUNT_KEYS, centsSchema, nameSchema } from "../shared/budget";
import {
	type CommitmentStatus,
	dayExistsIn,
	type DueAdjustment,
	dueDateFor,
	getNextDueDate,
	isReserved,
	isValidRule,
	type Occurrence,
} from "../shared/commitments";
import { formatDay, isoDateSchema, monthSchema } from "../shared/dates";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import {
	getCommitmentOccurrences,
	getCommitmentPayments,
	getCommitmentStates,
	scheduleOf,
} from "./model/commitments";
import { requireOpenCycle, requireWritableOpenCycle } from "./model/cycles";
import { logEvent } from "./model/events";
import { BAD_INPUT, parseInput } from "./model/input";
import { requireWritableSpace } from "./model/plus";
import { type SpaceKind } from "./model/spaces";
import { dueRule, spaceKind, spendable } from "./schema";

const NOT_FOUND = "No encontramos este dato.";
const ALREADY_PAID = "Este compromiso ya está pagado en este ciclo.";
const COMMITMENTS_CAP = 100;

const schedule = v.union(
	v.object({
		frequency: v.literal("monthly"),
		rule: dueRule,
	}),
	v.object({
		frequency: v.literal("once"),
		dueDate: v.string(),
	}),
);
type Schedule = Infer<typeof schedule>;

async function requireOwnCommitment(ctx: MutationCtx, kind: SpaceKind, id: Id<"commitments">) {
	const { userId, space } = await requireWritableSpace(ctx, kind);
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
	adjustment?: DueAdjustment,
) {
	if (when.frequency === "monthly") {
		if (!isValidRule(when.rule)) throw new ConvexError(BAD_INPUT);
		return {
			spaceId,
			name,
			amountCents,
			envelope,
			frequency: "monthly" as const,
			rule: when.rule,
			...(adjustment ? { adjustment } : {}),
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
		const { userId, space } = await requireWritableSpace(ctx, kind);
		parseInput(centsSchema, amountCents);
		const cleanName = parseInput(nameSchema, name);
		await ctx.db.insert("commitments", buildRow(space._id, cleanName, amountCents, envelope, when));
		await logEvent(ctx, space, userId, "commitment_added", {
			detail: rowLabel(cleanName, amountCents),
		});
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
		const { userId, space, row } = await requireOwnCommitment(ctx, kind, id);
		parseInput(centsSchema, amountCents);
		const cleanName = parseInput(nameSchema, name);
		await ctx.db.replace(
			"commitments",
			row._id,
			buildRow(
				row.spaceId,
				cleanName,
				amountCents,
				envelope,
				when,
				row.frequency === "monthly" ? row.adjustment : undefined,
			),
		);
		await logEvent(ctx, space, userId, "commitment_edited", {
			detail: rowLabel(cleanName, amountCents),
		});
		return null;
	},
});

/** `delete` is reserved in JS; callers use api.commitments.remove. */
export const remove = mutation({
	args: { space: spaceKind, id: v.id("commitments") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { userId, space, row } = await requireOwnCommitment(ctx, kind, id);
		await ctx.db.delete("commitments", id);
		await logEvent(ctx, space, userId, "commitment_removed", {
			detail: rowLabel(row.name, row.amountCents),
		});
		return null;
	},
});

/** Moves a monthly commitment's date for one month only. */
export const setDueThisMonth = mutation({
	args: { space: spaceKind, id: v.id("commitments"), month: v.string(), day: v.number() },
	returns: v.null(),
	handler: async (ctx, { space: kind, id, month, day }) => {
		const { userId, space, row } = await requireOwnCommitment(ctx, kind, id);
		const schedule = scheduleOf(row);
		if (schedule.frequency !== "monthly") throw new ConvexError(NOT_FOUND);
		parseInput(monthSchema, month);
		if (!dayExistsIn(month, day)) throw new ConvexError(BAD_INPUT);
		await ctx.db.patch("commitments", id, { adjustment: { month, day } });
		const before = dueDateFor(schedule.rule, schedule.adjustment, month);
		const after = dueDateFor(schedule.rule, { month, day }, month);
		if (before !== after) {
			await logEvent(ctx, space, userId, "commitment_edited", {
				detail: row.name,
				before: formatDay(before),
				after: formatDay(after),
			});
		}
		return null;
	},
});

/** Takes the one-month change back: the date follows the rule again. */
export const clearDueThisMonth = mutation({
	args: { space: spaceKind, id: v.id("commitments") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { userId, space, row } = await requireOwnCommitment(ctx, kind, id);
		const schedule = scheduleOf(row);
		if (schedule.frequency !== "monthly") throw new ConvexError(NOT_FOUND);
		const { adjustment } = schedule;
		if (!adjustment) return null;
		await ctx.db.patch("commitments", id, { adjustment: undefined });
		const before = dueDateFor(schedule.rule, adjustment, adjustment.month);
		const after = dueDateFor(schedule.rule, undefined, adjustment.month);
		if (before !== after) {
			await logEvent(ctx, space, userId, "commitment_edited", {
				detail: row.name,
				before: formatDay(before),
				after: formatDay(after),
			});
		}
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
	// The rule of a monthly (null for a one-off) and whether this charge's date is a one-month change.
	rule: v.union(dueRule, v.null()),
	adjusted: v.boolean(),
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
		return { dueDate: getNextDueDate(scheduleOf(row), cycle.endDate), status: "later" };
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
			.flatMap(({ row, charge }) => {
				if (!charge) return [];
				const schedule = scheduleOf(row);
				const monthly = schedule.frequency === "monthly" ? schedule : null;
				return [
					{
						id: row._id,
						name: row.name,
						amountCents: row.amountCents,
						envelope: row.envelope,
						frequency: row.frequency,
						rule: monthly?.rule ?? null,
						adjusted: monthly?.adjustment?.month === charge.dueDate.slice(0, 7),
						...charge,
					},
				];
			})
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
		const { userId, space, cycle, today } = await requireWritableOpenCycle(ctx, kind);
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
		await logEvent(ctx, space, userId, "commitment_paid", {
			detail: rowLabel(row.name, paidCents),
		});
		return null;
	},
});
