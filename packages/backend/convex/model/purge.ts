import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const BATCH = 500;

async function drop<T extends "transactions" | "commitments" | "goals" | "spaceEvents">(
	ctx: MutationCtx,
	table: T,
	rows: Doc<T>[],
) {
	for (const row of rows) await ctx.db.delete(table, row._id);
	return rows.length > 0;
}

/**
 * One batch of deleting a space: the rows of its first cycle, then that cycle, then its commitments,
 * goals and events, and last its members and the space. Call it again until the space is gone.
 */
export async function purgeSpace(ctx: MutationCtx, spaceId: Id<"spaces">) {
	const cycle = await ctx.db
		.query("cycles")
		.withIndex("by_space_start", (q) => q.eq("spaceId", spaceId))
		.first();
	if (cycle) {
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.take(BATCH);
		if (!(await drop(ctx, "transactions", rows))) await ctx.db.delete("cycles", cycle._id);
		return;
	}
	const commitments = ctx.db
		.query("commitments")
		.withIndex("by_spaceId", (q) => q.eq("spaceId", spaceId));
	if (await drop(ctx, "commitments", await commitments.take(BATCH))) return;
	const goals = ctx.db.query("goals").withIndex("by_spaceId", (q) => q.eq("spaceId", spaceId));
	if (await drop(ctx, "goals", await goals.take(BATCH))) return;
	const events = ctx.db
		.query("spaceEvents")
		.withIndex("by_spaceId", (q) => q.eq("spaceId", spaceId));
	if (await drop(ctx, "spaceEvents", await events.take(BATCH))) return;

	const members = ctx.db
		.query("spaceMembers")
		.withIndex("by_spaceId", (q) => q.eq("spaceId", spaceId));
	for (const member of await members.take(2)) await ctx.db.delete("spaceMembers", member._id);
	await ctx.db.delete("spaces", spaceId);
}
