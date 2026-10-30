import { ConvexError, v } from "convex/values";
import {
	AMOUNT_KEYS,
	applyIncome,
	type EnvelopeAmounts,
	isValidCents,
	NOTE_MAX_LENGTH,
	subtractAmounts,
} from "../shared/budget";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation } from "./_generated/server";
import { requireOpenCycle } from "./model/cycles";
import { spaceKind, spendable } from "./schema";

type SpaceKind = Doc<"spaces">["kind"];
type TxKind = Doc<"transactions">["kind"];

const BAD_INPUT = "Revisa los datos e inténtalo otra vez.";
const NOT_FOUND = "No encontramos este dato.";
const NOT_AUTHOR = "Solo quien lo registró puede cambiarlo.";
const INCOME_ALREADY_SAVED = "Ya usaste parte de este ingreso en tu ahorro. Retíralo primero.";

function cleanNote(note: string | undefined) {
	if (note === undefined) return undefined;
	const trimmed = note.trim();
	if (trimmed.length > NOTE_MAX_LENGTH) throw new ConvexError(BAD_INPUT);
	return trimmed.length > 0 ? trimmed : undefined;
}

async function requireOwnOpenRow(
	ctx: MutationCtx,
	kind: SpaceKind,
	id: Id<"transactions">,
	expected: TxKind,
) {
	const open = await requireOpenCycle(ctx, kind);
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
		const { userId, space, cycle, today } = await requireOpenCycle(ctx, kind);
		if (!isValidCents(amountCents)) throw new ConvexError(BAD_INPUT);
		const key = AMOUNT_KEYS[envelope];
		await ctx.db.insert("transactions", {
			kind: "expense",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents,
			date: today,
			envelope,
			note: cleanNote(note),
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
		const { cycle, row } = await requireOwnOpenRow(ctx, kind, id, "expense");
		if (row.kind !== "expense") throw new ConvexError(NOT_FOUND);
		if (!isValidCents(amountCents)) throw new ConvexError(BAD_INPUT);
		const oldKey = AMOUNT_KEYS[row.envelope];
		const newKey = AMOUNT_KEYS[envelope];
		let envelopes = patchEnvelope(cycle.envelopes, oldKey, row.amountCents);
		envelopes = patchEnvelope(envelopes, newKey, -amountCents);
		await ctx.db.patch("transactions", id, {
			amountCents,
			envelope,
			note: cleanNote(note),
		});
		await ctx.db.patch("cycles", cycle._id, { envelopes });
		return null;
	},
});

export const deleteExpense = mutation({
	args: { space: spaceKind, id: v.id("transactions") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { cycle, row } = await requireOwnOpenRow(ctx, kind, id, "expense");
		if (row.kind !== "expense") throw new ConvexError(NOT_FOUND);
		const key = AMOUNT_KEYS[row.envelope];
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: patchEnvelope(cycle.envelopes, key, row.amountCents),
		});
		await ctx.db.delete("transactions", id);
		return null;
	},
});

export const addIncome = mutation({
	args: {
		space: spaceKind,
		amountCents: v.number(),
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, amountCents, note }) => {
		const { userId, space, cycle, today } = await requireOpenCycle(ctx, kind);
		if (!isValidCents(amountCents)) throw new ConvexError(BAD_INPUT);
		const { envelopes, allocation } = applyIncome(cycle.envelopes, amountCents, cycle.split);
		await ctx.db.insert("transactions", {
			kind: "income",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents,
			date: today,
			allocation,
			note: cleanNote(note),
		});
		await ctx.db.patch("cycles", cycle._id, { envelopes });
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
		const { cycle, row } = await requireOwnOpenRow(ctx, kind, id, "income");
		if (row.kind !== "income") throw new ConvexError(NOT_FOUND);
		if (!isValidCents(amountCents)) throw new ConvexError(BAD_INPUT);
		const { envelopes, allocation } = applyIncome(
			subtractAmounts(cycle.envelopes, row.allocation),
			amountCents,
			cycle.split,
		);
		if (envelopes.savingsCents < 0) throw new ConvexError(INCOME_ALREADY_SAVED);
		await ctx.db.patch("transactions", id, {
			amountCents,
			allocation,
			note: cleanNote(note),
		});
		await ctx.db.patch("cycles", cycle._id, { envelopes });
		return null;
	},
});

export const deleteIncome = mutation({
	args: { space: spaceKind, id: v.id("transactions") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { cycle, row } = await requireOwnOpenRow(ctx, kind, id, "income");
		if (row.kind !== "income") throw new ConvexError(NOT_FOUND);
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: envelopesWithoutIncome(cycle.envelopes, row.allocation),
		});
		await ctx.db.delete("transactions", id);
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
		const { userId, space, cycle, today } = await requireOpenCycle(ctx, kind);
		if (!isValidCents(amountCents) || amountCents > cycle.envelopes.savingsCents) {
			throw new ConvexError(BAD_INPUT);
		}
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
			note: cleanNote(note),
		});
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: patchEnvelope(cycle.envelopes, "savingsCents", -amountCents),
		});
		if (goalId === undefined) {
			await ctx.db.patch("spaces", space._id, {
				fundCents: space.fundCents + amountCents,
			});
		}
		return null;
	},
});

export const withdrawSaving = mutation({
	args: {
		space: spaceKind,
		amountCents: v.number(),
		envelope: spendable,
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, amountCents, envelope, note }) => {
		const { userId, space, cycle, today } = await requireOpenCycle(ctx, kind);
		if (!isValidCents(amountCents) || amountCents > space.fundCents) {
			throw new ConvexError(BAD_INPUT);
		}
		const key = AMOUNT_KEYS[envelope];
		await ctx.db.insert("transactions", {
			kind: "withdrawal",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents,
			date: today,
			reason: "other",
			note: cleanNote(note),
		});
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: patchEnvelope(cycle.envelopes, key, amountCents),
		});
		await ctx.db.patch("spaces", space._id, {
			fundCents: space.fundCents - amountCents,
		});
		return null;
	},
});
