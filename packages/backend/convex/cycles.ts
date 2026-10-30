import { v } from "convex/values";
import { getLimaDate } from "../shared/dates";
import { mutation } from "./_generated/server";
import { ensureOpenCycle } from "./model/cycles";
import { requireSpace } from "./model/spaces";
import { spaceKind } from "./schema";

/** Call when the app opens so a new cycle exists even if the midnight cron did not run. */
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
