import { ConvexError, v } from "convex/values";
import * as z from "zod/mini";
import { moneyLabel } from "../shared/activity";
import { centsSchema, nameSchema } from "../shared/budget";
import { isoDateSchema } from "../shared/dates";
import { suggestFundGoalCents } from "../shared/plan";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { getCycleAt } from "./model/cycles";
import { logEvent } from "./model/events";
import { parseInput } from "./model/input";
import { requirePlus, requireWritableSpace } from "./model/plus";
import { requirePlan, requireSpace, type SpaceKind } from "./model/spaces";
import { spaceKind } from "./schema";

const NOT_FOUND = "No encontramos este dato.";
const FREE_GOAL_CAP = 2;

const goalFieldsSchema = z.object({
	name: nameSchema,
	targetCents: centsSchema,
	targetMonth: z.optional(z.string().check(z.regex(/^\d{4}-(0[1-9]|1[0-2])$/))),
});

async function requireOwnGoal(ctx: MutationCtx, kind: SpaceKind, id: Id<"goals">) {
	const { userId, space } = await requireWritableSpace(ctx, kind);
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

/** `suggestedFundGoalCents` is null when there is no open cycle for `today`. */
export const fund = query({
	args: { space: spaceKind, today: v.string() },
	returns: v.object({
		fundCents: v.number(),
		fundGoalCents: v.union(v.number(), v.null()),
		suggestedFundGoalCents: v.union(v.number(), v.null()),
	}),
	handler: async (ctx, { space: kind, today }) => {
		parseInput(isoDateSchema, today);
		const { space } = await requireSpace(ctx, kind);
		const cycle = await getCycleAt(ctx, space._id, today);
		const suggested =
			cycle && cycle.endDate >= today
				? suggestFundGoalCents(await requirePlan(ctx, space), cycle.split)
				: null;
		return {
			fundCents: space.fundCents,
			fundGoalCents: space.fundGoalCents ?? null,
			suggestedFundGoalCents: suggested,
		};
	},
});

/** `null` removes the fund goal; the money in the fund stays. */
export const setFundGoal = mutation({
	args: { space: spaceKind, targetCents: v.union(v.number(), v.null()) },
	returns: v.null(),
	handler: async (ctx, { space: kind, targetCents }) => {
		const { userId, space } = await requireWritableSpace(ctx, kind);
		parseInput(z.nullable(centsSchema), targetCents);
		await ctx.db.patch("spaces", space._id, { fundGoalCents: targetCents ?? undefined });
		const label = (cents: number | undefined) =>
			cents === undefined ? "Sin meta" : moneyLabel(cents);
		await logEvent(ctx, space, userId, "fund_goal_changed", {
			before: label(space.fundGoalCents),
			after: label(targetCents ?? undefined),
		});
		return null;
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
		const { userId, space } = await requireWritableSpace(ctx, kind);
		const fields = parseInput(goalFieldsSchema, { name, targetCents, targetMonth });
		const existing = await ctx.db
			.query("goals")
			.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
			.take(FREE_GOAL_CAP + 1);
		if (existing.length >= FREE_GOAL_CAP) await requirePlus(ctx, userId);

		await ctx.db.insert("goals", { spaceId: space._id, ...fields });
		await logEvent(ctx, space, userId, "goal_added", { detail: fields.name });
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
		const { userId, space, row } = await requireOwnGoal(ctx, kind, id);
		const fields = parseInput(goalFieldsSchema, { name, targetCents, targetMonth });
		await ctx.db.patch("goals", row._id, fields);
		await logEvent(ctx, space, userId, "goal_edited", {
			detail: fields.name,
			...(row.targetCents === fields.targetCents
				? {}
				: { before: moneyLabel(row.targetCents), after: moneyLabel(fields.targetCents) }),
		});
		return null;
	},
});

/** `delete` is reserved in JS; callers use api.goals.remove. */
export const remove = mutation({
	args: { space: spaceKind, id: v.id("goals") },
	returns: v.null(),
	handler: async (ctx, { space: kind, id }) => {
		const { userId, space, row } = await requireOwnGoal(ctx, kind, id);
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
		await logEvent(ctx, space, userId, "goal_removed", { detail: row.name });
		return null;
	},
});
