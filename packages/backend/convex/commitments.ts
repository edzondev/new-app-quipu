import { ConvexError, type Infer, v } from "convex/values";
import { AMOUNT_KEYS, isValidCents } from "../shared/budget";
import { isIsoDate } from "../shared/dates";
import { getNextDueDate, isReserved } from "../shared/commitments";
import { isValidMonthDay } from "../shared/plan";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { getCommitmentOccurrences } from "./model/commitments";
import { requireOpenCycle } from "./model/cycles";
import { requireSpace, type SpaceKind } from "./model/spaces";
import { spaceKind, spendable } from "./schema";

const BAD_INPUT = "Revisa los datos e inténtalo otra vez.";
const NOT_FOUND = "No encontramos este dato.";
const ALREADY_PAID = "Este compromiso ya está pagado en este ciclo.";
const NAME_MAX = 40;
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

function cleanName(name: string) {
	const trimmed = name.trim();
	if (trimmed.length === 0 || trimmed.length > NAME_MAX) throw new ConvexError(BAD_INPUT);
	return trimmed;
}

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
		if (!isValidMonthDay(when.dueDay)) throw new ConvexError(BAD_INPUT);
		return {
			spaceId,
			name,
			amountCents,
			envelope,
			frequency: "monthly" as const,
			dueDay: when.dueDay,
		};
	}
	if (!isIsoDate(when.dueDate)) throw new ConvexError(BAD_INPUT);
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
		if (!isValidCents(amountCents)) throw new ConvexError(BAD_INPUT);
		await ctx.db.insert(
			"commitments",
			buildRow(space._id, cleanName(name), amountCents, envelope, when),
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
		if (!isValidCents(amountCents)) throw new ConvexError(BAD_INPUT);
		await ctx.db.replace(
			"commitments",
			row._id,
			buildRow(row.spaceId, cleanName(name), amountCents, envelope, when),
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

/** One row per commitment: its oldest unpaid charge, or the last paid one. Totals follow the day's number. */
export const list = query({
	args: { space: spaceKind, today: v.string() },
	returns: v.object({
		payableCents: v.number(),
		paidCents: v.number(),
		items: v.array(
			v.object({
				id: v.id("commitments"),
				name: v.string(),
				amountCents: v.number(),
				envelope: spendable,
				dueDate: v.string(),
				status: v.union(
					v.literal("paid"),
					v.literal("overdue"),
					v.literal("upcoming"),
					v.literal("reserved"),
					v.literal("later"),
				),
			}),
		),
	}),
	handler: async (ctx, { space: kind, today }) => {
		if (!isIsoDate(today)) throw new ConvexError(BAD_INPUT);
		const { space, cycle } = await requireOpenCycle(ctx, kind, today);
		const [rows, cycleTx] = await Promise.all([
			ctx.db
				.query("commitments")
				.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
				.take(COMMITMENTS_CAP),
			ctx.db
				.query("transactions")
				.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
				.collect(),
		]);
		const charges = await Promise.all(
			rows.map(async (row) => {
				const occurrences = await getCommitmentOccurrences(ctx, row, today, cycle.endDate);
				const current = occurrences.find(({ status }) => status !== "paid") ??
					occurrences.at(-1) ?? {
						dueDate: getNextDueDate(row, cycle.endDate),
						status: "later" as const,
					};
				const reservedCount = occurrences.filter(({ status }) => isReserved(status)).length;
				return { row, current, reservedCount };
			}),
		);
		const items = charges
			.map(({ row, current }) => ({
				id: row._id,
				name: row.name,
				amountCents: row.amountCents,
				envelope: row.envelope,
				...current,
			}))
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
		return {
			payableCents: charges.reduce(
				(sum, { row, reservedCount }) => sum + row.amountCents * reservedCount,
				0,
			),
			paidCents: cycleTx.reduce(
				(sum, tx) =>
					tx.kind === "expense" && tx.commitmentId !== undefined ? sum + tx.amountCents : sum,
				0,
			),
			items,
		};
	},
});

export const markPaid = mutation({
	args: { space: spaceKind, id: v.id("commitments"), amountCents: v.optional(v.number()) },
	returns: v.null(),
	handler: async (ctx, { space: kind, id, amountCents }) => {
		const { userId, space, cycle, today } = await requireOpenCycle(ctx, kind);
		const row = await ctx.db.get("commitments", id);
		if (!row || row.spaceId !== space._id) throw new ConvexError(NOT_FOUND);

		const occurrences = await getCommitmentOccurrences(ctx, row, today, cycle.endDate);
		if (occurrences.every(({ status }) => status === "paid")) throw new ConvexError(ALREADY_PAID);

		const paidCents = amountCents ?? row.amountCents;
		if (!isValidCents(paidCents)) throw new ConvexError(BAD_INPUT);

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
			envelopes: { ...cycle.envelopes, [key]: cycle.envelopes[key] - paidCents },
		});
		return null;
	},
});
