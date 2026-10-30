import { ZERO_AMOUNTS } from "../../shared/budget";
import { getCycleRange } from "../../shared/dates";
import type { Plan, Split } from "../../shared/plan";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const ZERO_CARRY = { needsCents: 0, wantsCents: 0 };

export function createFirstCycle(
	ctx: MutationCtx,
	spaceId: Id<"spaces">,
	plan: Pick<Plan, "cadence" | "cycleStartDay">,
	split: Split,
	today: string,
) {
	const range = getCycleRange(plan.cadence, plan.cycleStartDay, today);
	return ctx.db.insert("cycles", {
		spaceId,
		...range,
		split,
		envelopes: ZERO_AMOUNTS,
		carryIn: ZERO_CARRY,
	});
}
