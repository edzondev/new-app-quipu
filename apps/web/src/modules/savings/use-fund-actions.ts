import { useMutation } from "@tanstack/react-query";
import { readError } from "#/lib/read-error";
import type { Movement } from "#/modules/register/movement-draft";

type Id = Movement["id"];

/** Adds a row of the fund or of a goal, or with `editing` changes or deletes that one. `onAdded` runs once an add succeeded. */
export function useFundActions<Value>({
	add,
	onAdded,
	update,
	remove,
	onDone,
	editing,
}: {
	add: (value: Value) => Promise<unknown>;
	onAdded?: () => void;
	update: (id: Id, value: Value) => Promise<unknown>;
	remove: (id: Id) => Promise<unknown>;
	onDone: () => void;
	editing?: Movement;
}) {
	const save = useMutation({
		mutationFn: (value: Value) => (editing ? update(editing.id, value) : add(value)),
		onSuccess: () => {
			if (!editing) onAdded?.();
			onDone();
		},
	});
	const del = useMutation({ mutationFn: remove, onSuccess: onDone });
	const failed = save.isError ? save.error : del.isError ? del.error : null;

	return {
		save: save.mutate,
		remove: () => editing && del.mutate(editing.id),
		pending: save.isPending || del.isPending,
		error: failed ? readError(failed) : undefined,
	};
}
