import { ConvexError, v } from "convex/values";
import {
	AMOUNT_KEYS,
	applyIncome,
	centsAtMost,
	centsSchema,
	type EnvelopeAmounts,
	noteSchema,
	subtractAmounts,
	ZERO_AMOUNTS,
} from "../shared/budget";
import { addDays, isEarlyIncomeWindow, isoDateSchema } from "../shared/dates";
import { moneyLabel, rowLabel } from "../shared/activity";
import { firstName } from "../shared/household";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { logEvent } from "./model/events";
import { requireOpenCycle, requireWritableOpenCycle } from "./model/cycles";
import { requirePlan } from "./model/spaces";
import { parseInput } from "./model/input";
import { extraType, movementKind, spaceKind, spendable, withdrawalReason } from "./schema";

type SpaceKind = Doc<"spaces">["kind"];
type TxKind = Doc<"transactions">["kind"];

const NOT_FOUND = "No encontramos este dato.";
const NOT_AUTHOR = "Solo quien lo registró puede cambiarlo.";
const INCOME_ALREADY_SAVED = "Ya usaste parte de este ingreso en tu ahorro. Retíralo primero.";

async function requireOwnOpenRow(
	ctx: MutationCtx,
	kind: SpaceKind,
	id: Id<"transactions">,
	expected: TxKind,
) {
	const open = await requireWritableOpenCycle(ctx, kind);
	const row = await ctx.db.get("transactions", id);
	if (
		!row ||
		row.kind !== expected ||
		row.spaceId !== open.space._id ||
		row.cycleId !== open.cycle._id
	) {
		throw new ConvexError(NOT_FOUND);
	}
	if (row.userId !== open.userId) throw new ConvexError(NOT_AUTHOR);
	return { ...open, row };
}

function patchEnvelope(
	envelopes: EnvelopeAmounts,
	key: keyof EnvelopeAmounts,
	delta: number,
): EnvelopeAmounts {
	return { ...envelopes, [key]: envelopes[key] + delta };
}

function envelopesWithoutIncome(
	envelopes: EnvelopeAmounts,
	allocation: EnvelopeAmounts,
): EnvelopeAmounts {
	const without = subtractAmounts(envelopes, allocation);
	if (without.savingsCents < 0) throw new ConvexError(INCOME_ALREADY_SAVED);
	return without;
}

export const addExpense = mutation({
	args: {
		space: spaceKind,
		amountCents: v.number(),
		envelope: spendable,
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, amountCents, envelope, note }) => {
		const { userId, space, cycle, today } = await requireWritableOpenCycle(ctx, kind);
		parseInput(centsSchema, amountCents);
		const key = AMOUNT_KEYS[envelope];
		await ctx.db.insert("transactions", {
			kind: "expense",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents,
			date: today,
			envelope,
			note: parseInput(noteSchema, note),
		});
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: patchEnvelope(cycle.envelopes, key, -amountCents),
		});
		return null;
	},
});

export const updateExpense = mutation({
	args: {
		space: spaceKind,
		id: v.id("transactions"),
		amountCents: v.number(),
		envelope: spendable,
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, id, amountCents, envelope, note }) => {
		const { userId, space, cycle, row } = await requireOwnOpenRow(ctx, kind, id, "expense");
		if (row.kind !== "expense") throw new ConvexError(NOT_FOUND);
		parseInput(centsSchema, amountCents);
		const oldKey = AMOUNT_KEYS[row.envelope];
		const newKey = AMOUNT_KEYS[envelope];
		let envelopes = patchEnvelope(cycle.envelopes, oldKey, row.amountCents);
		envelopes = patchEnvelope(envelopes, newKey, -amountCents);
		await ctx.db.patch("transactions", id, {
			amountCents,
			envelope,
			note: parseInput(noteSchema, note),
		});
		await ctx.db.patch("cycles", cycle._id, { envelopes });
		await logEvent(ctx, space, userId, "expense_edited", {
			detail: row.note,
			before: moneyLabel(row.amountCents),
			after: moneyLabel(amountCents),
		});
		return null;
	},
});

export const deleteExpense = mutation({
	args: { space: spaceKind, id: v.id("transactions") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { userId, space, cycle, row } = await requireOwnOpenRow(ctx, kind, id, "expense");
		if (row.kind !== "expense") throw new ConvexError(NOT_FOUND);
		const key = AMOUNT_KEYS[row.envelope];
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: patchEnvelope(cycle.envelopes, key, row.amountCents),
		});
		await ctx.db.delete("transactions", id);
		await logEvent(ctx, space, userId, "expense_deleted", {
			detail: rowLabel(row.note, row.amountCents),
		});
		return null;
	},
});

/**
 * Without `extra` it is income "Para este ciclo". Inside the early window it goes to the next cycle
 * unless `forNextCycle` is false.
 */
export const addIncome = mutation({
	args: {
		space: spaceKind,
		amountCents: v.number(),
		extra: v.optional(v.object({ type: extraType, toSavings: v.boolean() })),
		forNextCycle: v.optional(v.boolean()),
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, amountCents, extra, forNextCycle: chosen, note }) => {
		const { userId, space, cycle, today } = await requireWritableOpenCycle(ctx, kind);
		parseInput(centsSchema, amountCents);
		const plan = await requirePlan(ctx, space);
		const forNextCycle =
			!extra && isEarlyIncomeWindow(plan.cadence, today, cycle.endDate) && chosen !== false;
		const { envelopes, allocation } = applyIncome(
			cycle.envelopes,
			amountCents,
			cycle.split,
			extra?.toSavings,
		);
		await ctx.db.insert("transactions", {
			kind: "income",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents,
			date: today,
			extraType: extra?.type,
			toSavings: extra?.toSavings,
			forNextCycle: forNextCycle || undefined,
			allocation,
			note: parseInput(noteSchema, note),
		});
		if (!forNextCycle) await ctx.db.patch("cycles", cycle._id, { envelopes });
		return null;
	},
});

export const updateIncome = mutation({
	args: {
		space: spaceKind,
		id: v.id("transactions"),
		amountCents: v.number(),
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, id, amountCents, note }) => {
		const { userId, space, cycle, row } = await requireOwnOpenRow(ctx, kind, id, "income");
		if (row.kind !== "income") throw new ConvexError(NOT_FOUND);
		parseInput(centsSchema, amountCents);
		const { envelopes, allocation } = applyIncome(
			subtractAmounts(cycle.envelopes, row.forNextCycle ? ZERO_AMOUNTS : row.allocation),
			amountCents,
			cycle.split,
			row.toSavings,
		);
		if (envelopes.savingsCents < 0) throw new ConvexError(INCOME_ALREADY_SAVED);
		await ctx.db.patch("transactions", id, {
			amountCents,
			allocation,
			note: parseInput(noteSchema, note),
		});
		if (!row.forNextCycle) await ctx.db.patch("cycles", cycle._id, { envelopes });
		await logEvent(ctx, space, userId, "income_edited", {
			detail: row.note,
			before: moneyLabel(row.amountCents),
			after: moneyLabel(amountCents),
		});
		return null;
	},
});

export const deleteIncome = mutation({
	args: { space: spaceKind, id: v.id("transactions") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { userId, space, cycle, row } = await requireOwnOpenRow(ctx, kind, id, "income");
		if (row.kind !== "income") throw new ConvexError(NOT_FOUND);
		if (!row.forNextCycle) {
			await ctx.db.patch("cycles", cycle._id, {
				envelopes: envelopesWithoutIncome(cycle.envelopes, row.allocation),
			});
		}
		await ctx.db.delete("transactions", id);
		await logEvent(ctx, space, userId, "income_deleted", {
			detail: rowLabel(row.note, row.amountCents),
		});
		return null;
	},
});

export const addSaving = mutation({
	args: {
		space: spaceKind,
		amountCents: v.number(),
		goalId: v.optional(v.id("goals")),
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, amountCents, goalId, note }) => {
		const { userId, space, cycle, today } = await requireWritableOpenCycle(ctx, kind);
		parseInput(centsAtMost(cycle.envelopes.savingsCents), amountCents);
		if (goalId !== undefined) {
			const goal = await ctx.db.get("goals", goalId);
			if (!goal || goal.spaceId !== space._id) throw new ConvexError(NOT_FOUND);
		}
		await ctx.db.insert("transactions", {
			kind: "saving",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents,
			date: today,
			goalId,
			note: parseInput(noteSchema, note),
		});
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: patchEnvelope(cycle.envelopes, "savingsCents", -amountCents),
		});
		if (goalId === undefined) {
			await ctx.db.patch("spaces", space._id, {
				fundCents: space.fundCents + amountCents,
			});
		}
		const goal = goalId === undefined ? null : await ctx.db.get("goals", goalId);
		await logEvent(ctx, space, userId, "saving_added", {
			detail: goal?.name ?? "Fondo de emergencia",
			amountCents,
		});
		return null;
	},
});

export const withdrawSaving = mutation({
	args: {
		space: spaceKind,
		amountCents: v.number(),
		reason: withdrawalReason,
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, amountCents, reason, note }) => {
		const { userId, space, cycle, today } = await requireWritableOpenCycle(ctx, kind);
		parseInput(centsAtMost(space.fundCents), amountCents);
		await ctx.db.insert("transactions", {
			kind: "withdrawal",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents,
			date: today,
			reason,
			note: parseInput(noteSchema, note),
		});
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: patchEnvelope(cycle.envelopes, "needsCents", amountCents),
		});
		await ctx.db.patch("spaces", space._id, {
			fundCents: space.fundCents - amountCents,
		});
		await logEvent(ctx, space, userId, "withdrawal", { amountCents });
		return null;
	},
});

function listedEnvelope(row: Doc<"transactions">) {
	if (row.kind === "expense" || row.kind === "contribution") return row.envelope;
	if (row.kind === "saving" || row.kind === "withdrawal") return "savings" as const;
	return null;
}

/**
 * Open cycle movements, newest first. `startsOn` is the next cycle's first day for an early income, else null.
 * `who` is the author name in household, else null.
 */
export const list = query({
	args: { space: spaceKind, today: v.string() },
	returns: v.object({
		startDate: v.string(),
		endDate: v.string(),
		rows: v.array(
			v.object({
				id: v.id("transactions"),
				kind: movementKind,
				amountCents: v.number(),
				date: v.string(),
				note: v.union(v.string(), v.null()),
				envelope: v.union(v.literal("needs"), v.literal("wants"), v.literal("savings"), v.null()),
				extra: v.boolean(),
				startsOn: v.union(v.string(), v.null()),
				mine: v.boolean(),
				who: v.union(v.string(), v.null()),
			}),
		),
	}),
	handler: async (ctx, { space: kind, today }) => {
		parseInput(isoDateSchema, today);
		const { userId, space, cycle } = await requireOpenCycle(ctx, kind, today);
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.order("desc")
			.take(500);

		const whoByUser = new Map<string, string | null>();
		if (space.kind === "household") {
			const authorIds = [...new Set(rows.map((row) => row.userId))];
			await Promise.all(
				authorIds.map(async (authorId) => {
					const user = await authComponent.getAnyUserById(ctx, authorId);
					whoByUser.set(authorId, user ? firstName(user.name) : null);
				}),
			);
		}

		return {
			startDate: cycle.startDate,
			endDate: cycle.endDate,
			rows: rows.map((row) => ({
				id: row._id,
				kind: row.kind,
				amountCents: row.amountCents,
				date: row.date,
				note: row.note ?? null,
				envelope: listedEnvelope(row),
				extra: row.kind === "income" && row.extraType !== undefined,
				startsOn: row.kind === "income" && row.forNextCycle ? addDays(cycle.endDate, 1) : null,
				mine: row.userId === userId,
				who: space.kind === "household" ? (whoByUser.get(row.userId) ?? null) : null,
			})),
		};
	},
});
