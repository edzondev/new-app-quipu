import type { EventType } from "../../shared/activity";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type Fields = { detail?: string; before?: string; after?: string; amountCents?: number };

/** Records a change in the household's activity. A personal space has no activity. */
export async function logEvent(
	ctx: MutationCtx,
	space: Doc<"spaces">,
	userId: string,
	type: EventType,
	fields: Fields = {},
) {
	if (space.kind !== "household") return;
	await ctx.db.insert("spaceEvents", { spaceId: space._id, userId, type, ...fields });
}
