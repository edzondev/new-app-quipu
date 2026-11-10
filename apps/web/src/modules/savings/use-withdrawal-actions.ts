import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import { readError } from "#/lib/read-error";
import type { Movement } from "#/modules/register/movement-draft";

type Withdrawal = FunctionArgs<typeof api.transactions.withdrawSaving>;

/** Withdraws from the fund, or with `editing` changes or deletes that withdrawal. */
export function useWithdrawalActions(
	space: Withdrawal["space"],
	onDone: () => void,
	editing?: Movement,
) {
	const withdraw = useConvexMutation(api.transactions.withdrawSaving);
	const update = useConvexMutation(api.transactions.updateWithdrawal);
	const remove = useConvexMutation(api.transactions.deleteWithdrawal);
	const save = useMutation({
		mutationFn: (value: Omit<Withdrawal, "space">) =>
			editing ? update({ space, id: editing.id, ...value }) : withdraw({ space, ...value }),
		onSuccess: onDone,
	});
	const del = useMutation({
		mutationFn: (id: Movement["id"]) => remove({ space, id }),
		onSuccess: onDone,
	});
	const failed = save.isError ? save.error : del.isError ? del.error : null;

	return {
		save: save.mutate,
		remove: () => editing && del.mutate(editing.id),
		pending: save.isPending || del.isPending,
		error: failed ? readError(failed) : undefined,
	};
}
