import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import { readError } from "#/lib/read-error";
import type { Movement } from "#/modules/register/movement-draft";

type Space = FunctionArgs<typeof api.transactions.addSaving>["space"];

/** Adds a saving, or with `editing` changes or deletes that one (its destination stays). */
export function useSavingActions(space: Space, onDone: () => void, editing?: Movement) {
	const add = useConvexMutation(api.transactions.addSaving);
	const update = useConvexMutation(api.transactions.updateSaving);
	const remove = useConvexMutation(api.transactions.deleteSaving);
	const save = useMutation({
		mutationFn: (
			value: Pick<FunctionArgs<typeof api.transactions.addSaving>, "amountCents" | "goalId">,
		) =>
			editing
				? update({
						space,
						id: editing.id,
						amountCents: value.amountCents,
						note: editing.note ?? undefined,
					})
				: add({ space, ...value }),
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
