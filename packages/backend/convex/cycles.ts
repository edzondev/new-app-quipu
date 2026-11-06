import { ConvexError, v } from "convex/values";
import { addDays, getLimaDate } from "../shared/dates";
import { mutation, query } from "./_generated/server";
import { ensureOpenCycle, getCycleStarting } from "./model/cycles";
import { requireSpace, requireSpaceById } from "./model/spaces";
import { spaceKind } from "./schema";

/** Inicio calls this on open so a new cycle exists without waiting for the cron. */
export const ensureOpen = mutation({
	args: { space: spaceKind },
	returns: v.object({
		cycleId: v.id("cycles"),
		startDate: v.string(),
		endDate: v.string(),
	}),
	handler: async (ctx, { space: kind }) => {
		const { userId, space } = await requireSpace(ctx, kind);
		const cycle = await ensureOpenCycle(ctx, space, getLimaDate(), userId);
		return { cycleId: cycle._id, startDate: cycle.startDate, endDate: cycle.endDate };
	},
});

export const getUnseenClosed = query({
	args: { space: spaceKind },
	returns: v.union(
		v.null(),
		v.object({
			cycleId: v.id("cycles"),
			newCycleStart: v.string(),
			carriedCents: v.number(),
			fundedCents: v.number(),
		}),
	),
	handler: async (ctx, { space: kind }) => {
		const { userId, space } = await requireSpace(ctx, kind);
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
		const closed = await ctx.db
			.query("cycles")
			.withIndex("by_space_closedAt", (q) => q.eq("spaceId", space._id))
			.order("desc")
			.take(20);
		const latest = closed.find((cycle) => cycle.closedAt !== undefined);
		if (!latest || latest._id === profile?.lastSeenClosedCycleId) return null;
		const next = await getCycleStarting(ctx, space._id, addDays(latest.endDate, 1));
		if (!next) throw new ConvexError("No encontramos tu ciclo.");
		return {
			cycleId: latest._id,
			newCycleStart: next.startDate,
			carriedCents: next.carryIn.needsCents + next.carryIn.wantsCents,
			fundedCents: Math.max(0, latest.envelopes.savingsCents),
		};
	},
});

export const markClosedSeen = mutation({
	args: { cycleId: v.id("cycles") },
	returns: v.null(),
	handler: async (ctx, { cycleId }) => {
		const cycle = await ctx.db.get("cycles", cycleId);
		if (!cycle || cycle.closedAt === undefined) {
			throw new ConvexError("No encontramos este dato.");
		}
		const { userId } = await requireSpaceById(ctx, cycle.spaceId);
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
		if (!profile) throw new ConvexError("No encontramos tu perfil.");
		const lastSeen = profile.lastSeenClosedCycleId
			? await ctx.db.get("cycles", profile.lastSeenClosedCycleId)
			: null;
		const alreadyCoveredByLastSeen = lastSeen !== null && lastSeen.endDate >= cycle.endDate;
		if (alreadyCoveredByLastSeen) return null;
		await ctx.db.patch("profiles", profile._id, { lastSeenClosedCycleId: cycleId });
		return null;
	},
});
