import { ConvexError, v } from "convex/values";
import { isValidCents } from "../shared/budget";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { requirePlus } from "./model/plus";
import { requireSpace, type SpaceKind } from "./model/spaces";
import { spaceKind } from "./schema";

const BAD_INPUT = "Revisa los datos e inténtalo otra vez.";
const NOT_FOUND = "No encontramos este dato.";
const NAME_MAX = 40;
const FREE_GOAL_CAP = 2;

function cleanName(name: string) {
	const trimmed = name.trim();
	if (trimmed.length === 0 || trimmed.length > NAME_MAX) throw new ConvexError(BAD_INPUT);
	return trimmed;
}

function isValidTargetMonth(raw: string | undefined) {
	if (raw === undefined) return true;
	return /^\d{4}-\d{2}$/.test(raw);
}

async function requireOwnGoal(ctx: MutationCtx, kind: SpaceKind, id: Id<"goals">) {
	const { userId, space } = await requireSpace(ctx, kind);
	const row = await ctx.db.get("goals", id);
	if (!row || row.spaceId !== space._id) throw new ConvexError(NOT_FOUND);
	return { userId, space, row };
}

async function savedCentsFor(ctx: MutationCtx, goalId: Id<"goals">, spaceId: Id<"spaces">) {
	const rows = await ctx.db
		.query("transactions")
		.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", spaceId).eq("kind", "saving"))
		.take(500);
	return rows.reduce(
		(sum, row) => (row.kind === "saving" && row.goalId === goalId ? sum + row.amountCents : sum),
		0,
	);
}

export const list = query({
	args: { space: spaceKind },
	returns: v.array(
		v.object({
			id: v.id("goals"),
			name: v.string(),
			targetCents: v.number(),
			targetMonth: v.union(v.string(), v.null()),
			savedCents: v.number(),
		}),
	),
	handler: async (ctx, { space: kind }) => {
		const { space } = await requireSpace(ctx, kind);
		const goals = await ctx.db
			.query("goals")
			.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
			.take(50);
		const savings = await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", space._id).eq("kind", "saving"))
			.take(500);
		return goals.map((goal) => ({
			id: goal._id,
			name: goal.name,
			targetCents: goal.targetCents,
			targetMonth: goal.targetMonth ?? null,
			savedCents: savings.reduce(
				(sum, row) =>
					row.kind === "saving" && row.goalId === goal._id ? sum + row.amountCents : sum,
				0,
			),
		}));
	},
});

export const add = mutation({
	args: {
		space: spaceKind,
		name: v.string(),
		targetCents: v.number(),
		targetMonth: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, name, targetCents, targetMonth }) => {
		const { userId, space } = await requireSpace(ctx, kind);
		if (!isValidCents(targetCents) || !isValidTargetMonth(targetMonth)) {
			throw new ConvexError(BAD_INPUT);
		}
		const existing = await ctx.db
			.query("goals")
			.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
			.take(FREE_GOAL_CAP + 1);
		if (existing.length >= FREE_GOAL_CAP) await requirePlus(ctx, userId);

		await ctx.db.insert("goals", {
			spaceId: space._id,
			name: cleanName(name),
			targetCents,
			...(targetMonth !== undefined ? { targetMonth } : {}),
		});
		return null;
	},
});

export const update = mutation({
	args: {
		space: spaceKind,
		id: v.id("goals"),
		name: v.string(),
		targetCents: v.number(),
		targetMonth: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { space: kind, id, name, targetCents, targetMonth }) => {
		const { row } = await requireOwnGoal(ctx, kind, id);
		if (!isValidCents(targetCents) || !isValidTargetMonth(targetMonth)) {
			throw new ConvexError(BAD_INPUT);
		}
		await ctx.db.patch("goals", row._id, {
			name: cleanName(name),
			targetCents,
			...(targetMonth !== undefined ? { targetMonth } : {}),
		});
		return null;
	},
});

/** `delete` is reserved in JS; callers use api.goals.remove. */
export const remove = mutation({
	args: { space: spaceKind, id: v.id("goals") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { space, row } = await requireOwnGoal(ctx, kind, id);
		const savedCents = await savedCentsFor(ctx, row._id, space._id);
		if (savedCents > 0) {
			await ctx.db.patch("spaces", space._id, {
				fundCents: space.fundCents + savedCents,
			});
		}
		const savings = await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", space._id).eq("kind", "saving"))
			.take(500);
		for (const tx of savings) {
			if (tx.kind === "saving" && tx.goalId === row._id) {
				await ctx.db.replace("transactions", tx._id, {
					kind: "saving",
					spaceId: tx.spaceId,
					cycleId: tx.cycleId,
					userId: tx.userId,
					amountCents: tx.amountCents,
					date: tx.date,
					...(tx.note !== undefined ? { note: tx.note } : {}),
				});
			}
		}
		await ctx.db.delete("goals", row._id);
		return null;
	},
});
