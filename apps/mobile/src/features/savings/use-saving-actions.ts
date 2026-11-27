import { api } from "@quipu/backend/convex/_generated/api";
import { NEED_PLUS } from "@quipu/backend/shared/billing";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs, FunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import * as Haptics from "expo-haptics";
import { convex } from "@/lib/convex";
import { readError } from "@/lib/read-error";
import { useSingleFlight } from "@/lib/use-single-flight";

type Space = "personal" | "household";
/** A mutation's args without `space`: the hook adds it, so no sheet can write to another space. */
type Args<F extends FunctionReference<"mutation">> = Omit<FunctionArgs<F>, "space">;

type Command =
	| ({ kind: "addSaving" } & Args<typeof api.transactions.addSaving>)
	| ({ kind: "updateSaving" } & Args<typeof api.transactions.updateSaving>)
	| ({ kind: "deleteSaving" } & Args<typeof api.transactions.deleteSaving>)
	| ({ kind: "withdraw" } & Args<typeof api.transactions.withdrawSaving>)
	| ({ kind: "updateWithdrawal" } & Args<typeof api.transactions.updateWithdrawal>)
	| ({ kind: "deleteWithdrawal" } & Args<typeof api.transactions.deleteWithdrawal>)
	| ({ kind: "setFundGoal" } & Args<typeof api.goals.setFundGoal>)
	| ({ kind: "addGoal" } & Args<typeof api.goals.add>)
	| ({ kind: "updateGoal" } & Args<typeof api.goals.update>)
	| ({ kind: "removeGoal" } & Args<typeof api.goals.remove>);

function send(space: Space, command: Command) {
	switch (command.kind) {
		case "addSaving": {
			const { amountCents, goalId } = command;
			return convex.mutation(api.transactions.addSaving, { space, amountCents, goalId });
		}
		case "updateSaving": {
			const { id, amountCents, note } = command;
			return convex.mutation(api.transactions.updateSaving, { space, id, amountCents, note });
		}
		case "deleteSaving":
			return convex.mutation(api.transactions.deleteSaving, { space, id: command.id });
		case "withdraw": {
			const { amountCents, reason, note } = command;
			return convex.mutation(api.transactions.withdrawSaving, { space, amountCents, reason, note });
		}
		case "updateWithdrawal": {
			const { id, amountCents, reason, note } = command;
			return convex.mutation(api.transactions.updateWithdrawal, {
				space,
				id,
				amountCents,
				reason,
				note,
			});
		}
		case "deleteWithdrawal":
			return convex.mutation(api.transactions.deleteWithdrawal, { space, id: command.id });
		case "setFundGoal":
			return convex.mutation(api.goals.setFundGoal, { space, targetCents: command.targetCents });
		case "addGoal": {
			const { name, targetCents, targetMonth } = command;
			return convex.mutation(api.goals.add, { space, name, targetCents, targetMonth });
		}
		case "updateGoal": {
			const { id, name, targetCents, targetMonth } = command;
			return convex.mutation(api.goals.update, { space, id, name, targetCents, targetMonth });
		}
		case "removeGoal":
			return convex.mutation(api.goals.remove, { space, id: command.id });
	}
}

const needsPlus = (error: unknown) => error instanceof ConvexError && error.data === NEED_PLUS;

/**
 * Writes the fund, a goal or a saving of `space`. `run` resolves to whether it worked and vibrates only then.
 * «Needs Plus» is not an error to read: it calls `onNeedsPlus` and `error` stays empty. One per sheet, so a
 * save and a delete of the same sheet never both go, and an error does not follow into the next sheet.
 */
export function useSavingActions(space: Space, onNeedsPlus?: () => void) {
	const mutation = useMutation({
		mutationFn: (command: Command) => send(space, command),
		onError: (error) => {
			if (needsPlus(error)) onNeedsPlus?.();
		},
	});
	const runOnce = useSingleFlight(mutation.mutateAsync);

	async function run(command: Command) {
		const ok = await runOnce(command);
		if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		return ok;
	}

	const { error } = mutation;
	return {
		run,
		pending: mutation.isPending,
		error: error && !needsPlus(error) ? readError(error) : null,
	};
}
