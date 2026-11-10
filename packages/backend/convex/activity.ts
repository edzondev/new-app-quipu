import { v } from "convex/values";
import { parseInput } from "./model/input";
import { authComponent } from "./auth";
import { query } from "./_generated/server";
import { requireSpace } from "./model/spaces";
import { displayName } from "../shared/household";
import { eventType } from "./schema";
import * as z from "zod/mini";

const PAGE = 20;

/** Who changed what in the household, newest first. Follow `next` (a time) for older ones. */
export const list = query({
	args: { before: v.optional(v.number()) },
	returns: v.object({
		events: v.array(
			v.object({
				id: v.id("spaceEvents"),
				type: eventType,
				at: v.number(),
				mine: v.boolean(),
				who: v.string(),
				detail: v.union(v.string(), v.null()),
				before: v.union(v.string(), v.null()),
				after: v.union(v.string(), v.null()),
				amountCents: v.union(v.number(), v.null()),
			}),
		),
		next: v.union(v.number(), v.null()),
	}),
	handler: async (ctx, { before }) => {
		if (before !== undefined) parseInput(z.number(), before);
		const { userId, space } = await requireSpace(ctx, "household");
		const rows = await ctx.db
			.query("spaceEvents")
			.withIndex("by_spaceId", (q) =>
				before === undefined
					? q.eq("spaceId", space._id)
					: q.eq("spaceId", space._id).lt("_creationTime", before),
			)
			.order("desc")
			.take(PAGE + 1);
		const page = rows.slice(0, PAGE);

		const names = new Map<string, string>();
		await Promise.all(
			[...new Set(page.map((row) => row.userId))].map(async (authorId) => {
				const user = await authComponent.getAnyUserById(ctx, authorId);
				names.set(authorId, user ? displayName(user.name) : "");
			}),
		);
		return {
			events: page.map((row) => ({
				id: row._id,
				type: row.type,
				at: row._creationTime,
				mine: row.userId === userId,
				who: names.get(row.userId) ?? "",
				detail: row.detail ?? null,
				before: row.before ?? null,
				after: row.after ?? null,
				amountCents: row.amountCents ?? null,
			})),
			next: rows.length > PAGE ? (page.at(-1)?._creationTime ?? null) : null,
		};
	},
});
