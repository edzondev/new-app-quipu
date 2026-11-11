import { ConvexError, v } from "convex/values";
import * as z from "zod/mini";
import { moneyLabel, rowLabel } from "../shared/activity";
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
import { displayName } from "../shared/household";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { ensureOpenCycle, requireOpenCycle, requireWritableOpenCycle } from "./model/cycles";
import { logEvent } from "./model/events";
import { parseInput } from "./model/input";
import { requireWritableSpace } from "./model/plus";
import { requirePlan } from "./model/spaces";
import {
	envelope,
	extraType,
	movementKind,
	spaceKind,
	spendable,
	withdrawalReason,
} from "./schema";

type SpaceKind = Doc<"spaces">["kind"];
type TxKind = Doc<"transactions">["kind"];

const NOT_FOUND = "No encontramos este dato.";
const NOT_AUTHOR = "Solo quien lo registró puede cambiarlo.";
const INCOME_ALREADY_SAVED = "Ya usaste parte de este ingreso en tu ahorro. Retíralo primero.";
const SAVING_ALREADY_WITHDRAWN =
	"Ya retiraste parte de este ahorro del fondo. Borra primero ese retiro.";
const savingOverAhorro = (max: number) =>
	`Solo tienes ${moneyLabel(max)} para este ahorro. Baja el monto.`;
const withdrawalOverFund = (max: number) =>
	`Solo tienes ${moneyLabel(max)} en el fondo para este retiro. Baja el monto.`;
const CONTRIBUTION_CLOSED =
	"Este aporte ya no se puede cambiar: el ciclo de Nuestro espacio cerró.";
const contributionAlreadyWithdrawn = (cents: number) =>
	`No puedes borrar este aporte: en Nuestro espacio ya retiraron ${moneyLabel(cents)} de ese Ahorro.`;

/** Where a saving went, as the activity shows it: its goal or the fund. */
async function savingDestination(ctx: MutationCtx, goalId: Id<"goals"> | undefined) {
	const goal = goalId === undefined ? null : await ctx.db.get("goals", goalId);
	return goal?.name ?? "Fondo de emergencia";
}

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

async function requireHouseholdTarget(ctx: MutationCtx, userId: string, today: string) {
	const { space } = await requireWritableSpace(ctx, "household");
	const cycle = await ensureOpenCycle(ctx, space, today, userId);
	return { household: space, toCycle: cycle };
}

async function requireOwnContribution(ctx: MutationCtx, id: Id<"transactions">) {
	const open = await requireOwnOpenRow(ctx, "personal", id, "contribution");
	const { row } = open;
	if (row.kind !== "contribution") throw new ConvexError(NOT_FOUND);
	const target = await requireHouseholdTarget(ctx, open.userId, open.today);
	if (row.toCycleId !== target.toCycle._id) throw new ConvexError(CONTRIBUTION_CLOSED);
	return { ...open, ...target, row };
}

type ContributionMove = Pick<
	Extract<Doc<"transactions">, { kind: "contribution" }>,
	"amountCents" | "envelope" | "toEnvelope"
>;

async function moveContribution(
	ctx: MutationCtx,
	{ cycle, toCycle, row }: Awaited<ReturnType<typeof requireOwnContribution>>,
	next: ContributionMove | null,
) {
	let personal = patchEnvelope(cycle.envelopes, AMOUNT_KEYS[row.envelope], row.amountCents);
	let together = patchEnvelope(toCycle.envelopes, AMOUNT_KEYS[row.toEnvelope], -row.amountCents);
	if (next) {
		personal = patchEnvelope(personal, AMOUNT_KEYS[next.envelope], -next.amountCents);
		together = patchEnvelope(together, AMOUNT_KEYS[next.toEnvelope], next.amountCents);
	}
	if (together.savingsCents < 0) {
		throw new ConvexError(contributionAlreadyWithdrawn(-together.savingsCents));
	}
	await ctx.db.patch("cycles", cycle._id, { envelopes: personal });
	await ctx.db.patch("cycles", toCycle._id, { envelopes: together });
}

/** Money from a Personal envelope to an envelope of the household. A transfer: nobody's spending. */
export const addContribution = mutation({
	args: {
		amountCents: v.number(),
		envelope: spendable,
		toEnvelope: envelope,
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { amountCents, envelope: from, toEnvelope, note }) => {
		const { userId, space, cycle, today } = await requireOpenCycle(ctx, "personal");
		parseInput(centsSchema, amountCents);
		const { toCycle } = await requireHouseholdTarget(ctx, userId, today);
		await ctx.db.insert("transactions", {
			kind: "contribution",
			spaceId: space._id,
			cycleId: cycle._id,
			userId,
			amountCents,
			date: today,
			envelope: from,
			toCycleId: toCycle._id,
			toEnvelope,
			note: parseInput(noteSchema, note),
		});
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: patchEnvelope(cycle.envelopes, AMOUNT_KEYS[from], -amountCents),
		});
		await ctx.db.patch("cycles", toCycle._id, {
			envelopes: patchEnvelope(toCycle.envelopes, AMOUNT_KEYS[toEnvelope], amountCents),
		});
		return null;
	},
});

export const updateContribution = mutation({
	args: {
		id: v.id("transactions"),
		amountCents: v.number(),
		envelope: spendable,
		toEnvelope: envelope,
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { id, amountCents, envelope: from, toEnvelope, note }) => {
		const found = await requireOwnContribution(ctx, id);
		parseInput(centsSchema, amountCents);
		await moveContribution(ctx, found, { amountCents, envelope: from, toEnvelope });
		await ctx.db.patch("transactions", id, {
			amountCents,
			envelope: from,
			toEnvelope,
			note: parseInput(noteSchema, note),
		});
		await logEvent(ctx, found.household, found.userId, "contribution_edited", {
			detail: found.row.note,
			before: moneyLabel(found.row.amountCents),
			after: moneyLabel(amountCents),
		});
		return null;
	},
});

export const deleteContribution = mutation({
	args: { id: v.id("transactions") },
	returns: v.null(),
	handler: async (ctx, { id }) => {
		const found = await requireOwnContribution(ctx, id);
		await moveContribution(ctx, found, null);
		await ctx.db.delete("transactions", id);
		await logEvent(ctx, found.household, found.userId, "contribution_deleted", {
			detail: rowLabel(found.row.note, found.row.amountCents),
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
		await logEvent(ctx, space, userId, "saving_added", {
			detail: await savingDestination(ctx, goalId),
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

/** Sets a saving to `newCents` (0 deletes it): Ahorro and, if it went to the fund, the fund move by the difference. */
async function moveSaving(
	ctx: MutationCtx,
	space: Doc<"spaces">,
	cycle: Doc<"cycles">,
	row: Extract<Doc<"transactions">, { kind: "saving" }>,
	newCents: number,
) {
	const delta = newCents - row.amountCents;
	const toFund = row.goalId === undefined;
	if (toFund && space.fundCents + delta < 0) throw new ConvexError(SAVING_ALREADY_WITHDRAWN);
	await ctx.db.patch("cycles", cycle._id, {
		envelopes: patchEnvelope(cycle.envelopes, "savingsCents", -delta),
	});
	if (toFund)
		await ctx.db.patch("spaces", space._id, {
			fundCents: space.fundCents + delta,
		});
}

/** Sets a withdrawal to `newCents` (0 deletes it): the fund and Necesidades move by the difference. */
async function moveWithdrawal(
	ctx: MutationCtx,
	space: Doc<"spaces">,
	cycle: Doc<"cycles">,
	row: Extract<Doc<"transactions">, { kind: "withdrawal" }>,
	newCents: number,
) {
	const delta = newCents - row.amountCents;
	await ctx.db.patch("cycles", cycle._id, {
		envelopes: patchEnvelope(cycle.envelopes, "needsCents", delta),
	});
	await ctx.db.patch("spaces", space._id, {
		fundCents: space.fundCents - delta,
	});
}

export const updateSaving = mutation({
	args: {
		space: spaceKind,
		id: v.id("transactions"),
		amountCents: v.number(),
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, id, amountCents, note }) => {
		const { userId, space, cycle, row } = await requireOwnOpenRow(ctx, kind, id, "saving");
		if (row.kind !== "saving") throw new ConvexError(NOT_FOUND);
		const max = cycle.envelopes.savingsCents + row.amountCents;
		parseInput(centsSchema, amountCents);
		if (amountCents > max) throw new ConvexError(savingOverAhorro(max));
		const cleanNote = parseInput(noteSchema, note);
		await moveSaving(ctx, space, cycle, row, amountCents);
		await ctx.db.patch("transactions", id, { amountCents, note: cleanNote });
		if (amountCents !== row.amountCents || cleanNote !== row.note) {
			await logEvent(ctx, space, userId, "saving_edited", {
				detail: await savingDestination(ctx, row.goalId),
				before: moneyLabel(row.amountCents),
				after: moneyLabel(amountCents),
			});
		}
		return null;
	},
});

export const deleteSaving = mutation({
	args: { space: spaceKind, id: v.id("transactions") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { userId, space, cycle, row } = await requireOwnOpenRow(ctx, kind, id, "saving");
		if (row.kind !== "saving") throw new ConvexError(NOT_FOUND);
		await moveSaving(ctx, space, cycle, row, 0);
		await ctx.db.delete("transactions", id);
		await logEvent(ctx, space, userId, "saving_deleted", {
			detail: await savingDestination(ctx, row.goalId),
			amountCents: row.amountCents,
		});
		return null;
	},
});

export const updateWithdrawal = mutation({
	args: {
		space: spaceKind,
		id: v.id("transactions"),
		amountCents: v.number(),
		reason: withdrawalReason,
		note: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, id, amountCents, reason, note }) => {
		const { userId, space, cycle, row } = await requireOwnOpenRow(ctx, kind, id, "withdrawal");
		if (row.kind !== "withdrawal") throw new ConvexError(NOT_FOUND);
		const max = space.fundCents + row.amountCents;
		parseInput(centsSchema, amountCents);
		if (amountCents > max) throw new ConvexError(withdrawalOverFund(max));
		const cleanNote = parseInput(noteSchema, note);
		await moveWithdrawal(ctx, space, cycle, row, amountCents);
		await ctx.db.patch("transactions", id, { amountCents, reason, note: cleanNote });
		if (amountCents !== row.amountCents || reason !== row.reason || cleanNote !== row.note) {
			await logEvent(ctx, space, userId, "withdrawal_edited", {
				detail: row.note,
				before: moneyLabel(row.amountCents),
				after: moneyLabel(amountCents),
			});
		}
		return null;
	},
});

export const deleteWithdrawal = mutation({
	args: { space: spaceKind, id: v.id("transactions") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { userId, space, cycle, row } = await requireOwnOpenRow(ctx, kind, id, "withdrawal");
		if (row.kind !== "withdrawal") throw new ConvexError(NOT_FOUND);
		await moveWithdrawal(ctx, space, cycle, row, 0);
		await ctx.db.delete("transactions", id);
		await logEvent(ctx, space, userId, "withdrawal_deleted", {
			detail: rowLabel(row.note, row.amountCents),
		});
		return null;
	},
});

export function listedEnvelope(row: Doc<"transactions">, kind: SpaceKind) {
	if (row.kind === "contribution") return kind === "household" ? row.toEnvelope : row.envelope;
	if (row.kind === "expense") return row.envelope;
	if (row.kind === "saving" || row.kind === "withdrawal") return "savings" as const;
	return null;
}

const MAX_LISTED = 500;
const limitSchema = z.optional(z.int().check(z.positive(), z.maximum(MAX_LISTED)));

/**
 * Open cycle movements, newest first. `limit` asks for fewer (Inicio shows the last 5).
 * `startsOn` is the next cycle's first day for an early income, else null.
 * `who` is the author name in household, else null.
 */
export const list = query({
	args: { space: spaceKind, today: v.string(), limit: v.optional(v.number()) },
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
				envelope: v.union(envelope, v.null()),
				toEnvelope: v.union(envelope, v.null()),
				goalId: v.union(v.id("goals"), v.null()),
				reason: v.union(withdrawalReason, v.null()),
				extra: v.boolean(),
				startsOn: v.union(v.string(), v.null()),
				mine: v.boolean(),
				who: v.union(v.string(), v.null()),
			}),
		),
	}),
	handler: async (ctx, { space: kind, today, limit }) => {
		parseInput(isoDateSchema, today);
		parseInput(limitSchema, limit);
		const { userId, space, cycle } = await requireOpenCycle(ctx, kind, today);
		const take = limit ?? MAX_LISTED;
		const [own, received] = await Promise.all([
			ctx.db
				.query("transactions")
				.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
				.order("desc")
				.take(take),
			ctx.db
				.query("transactions")
				.withIndex("by_toCycleId", (q) => q.eq("toCycleId", cycle._id))
				.order("desc")
				.take(take),
		]);
		const rows = [...own, ...received]
			.sort((a, b) => b._creationTime - a._creationTime)
			.slice(0, take);

		const whoByUser = new Map<string, string | null>();
		if (space.kind === "household") {
			const authorIds = [...new Set(rows.map((row) => row.userId))];
			await Promise.all(
				authorIds.map(async (authorId) => {
					const user = await authComponent.getAnyUserById(ctx, authorId);
					whoByUser.set(authorId, user ? displayName(user.name) : null);
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
				envelope: listedEnvelope(row, space.kind),
				toEnvelope: row.kind === "contribution" ? row.toEnvelope : null,
				goalId: (row.kind === "saving" && row.goalId) || null,
				reason: row.kind === "withdrawal" ? row.reason : null,
				extra: row.kind === "income" && row.extraType !== undefined,
				startsOn: row.kind === "income" && row.forNextCycle ? addDays(cycle.endDate, 1) : null,
				mine: row.userId === userId,
				who: space.kind === "household" ? (whoByUser.get(row.userId) ?? null) : null,
			})),
		};
	},
});
