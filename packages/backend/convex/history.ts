import { v } from "convex/values";
import { isoDateSchema } from "../shared/dates";
import { displayName } from "../shared/household";
import { query } from "./_generated/server";
import { authComponent } from "./auth";
import { receivedAportes } from "./model/budget";
import { parseInput } from "./model/input";
import { requireSpace } from "./model/spaces";
import { envelope, movementKind } from "./schema";
import { listedEnvelope } from "./transactions";

const MAX_CYCLE_ROWS = 1_000;

/**
 * One page of the household history to download: every movement of one cycle, newest first, from
 * the latest cycle (or the one before `before`). Follow `next` until null. Never needs Plus.
 * `who` is null when that person's account no longer exists. `auto` is the close's own saving.
 */
export const household = query({
	args: { before: v.optional(v.string()) },
	returns: v.object({
		rows: v.array(
			v.object({
				date: v.string(),
				kind: movementKind,
				envelope: v.union(envelope, v.null()),
				note: v.union(v.string(), v.null()),
				amountCents: v.number(),
				who: v.union(v.string(), v.null()),
				auto: v.boolean(),
			}),
		),
		next: v.union(v.string(), v.null()),
	}),
	handler: async (ctx, { before }) => {
		if (before !== undefined) parseInput(isoDateSchema, before);
		const { space } = await requireSpace(ctx, "household");
		const [cycle, older] = await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) =>
				before === undefined
					? q.eq("spaceId", space._id)
					: q.eq("spaceId", space._id).lt("startDate", before),
			)
			.order("desc")
			.take(2);
		if (!cycle) return { rows: [], next: null };

		const [own, received] = await Promise.all([
			ctx.db
				.query("transactions")
				.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
				.take(MAX_CYCLE_ROWS),
			receivedAportes(ctx, cycle._id, MAX_CYCLE_ROWS),
		]);
		const rows = [...own, ...received].sort((a, b) => b._creationTime - a._creationTime);

		const names = new Map<string, string | null>();
		await Promise.all(
			[...new Set(rows.map((row) => row.userId))].map(async (userId) => {
				const user = await authComponent.getAnyUserById(ctx, userId);
				names.set(userId, user ? displayName(user.name) : null);
			}),
		);

		return {
			rows: rows.map((row) => ({
				date: row.date,
				kind: row.kind,
				envelope: listedEnvelope(row, "household"),
				note: row.note ?? null,
				amountCents: row.amountCents,
				who: names.get(row.userId) ?? null,
				auto: row.kind === "saving" && row.auto === true,
			})),
			next: older ? cycle.startDate : null,
		};
	},
});
