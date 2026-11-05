import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import { readError } from "#/lib/read-error";
import type { Kind, Movement } from "./movement-draft";

export type SaveValues =
	| {
			kind: "expense";
			id?: Movement["id"];
			amountCents: number;
			envelope: "needs" | "wants";
			note?: string;
	  }
	| {
			kind: "income";
			id?: Movement["id"];
			amountCents: number;
			note?: string;
			extra?: FunctionArgs<typeof api.transactions.addIncome>["extra"];
			forNextCycle?: boolean;
	  };

type Command = SaveValues | { kind: "delete"; entity: Kind; id: Movement["id"] };

export function useMovementActions(space: "personal" | "household", onDone: () => void) {
	const addExpense = useConvexMutation(api.transactions.addExpense);
	const updateExpense = useConvexMutation(api.transactions.updateExpense);
	const deleteExpense = useConvexMutation(api.transactions.deleteExpense);
	const addIncome = useConvexMutation(api.transactions.addIncome);
	const updateIncome = useConvexMutation(api.transactions.updateIncome);
	const deleteIncome = useConvexMutation(api.transactions.deleteIncome);

	const action = useMutation({
		mutationFn: async (command: Command) => {
			switch (command.kind) {
				case "delete":
					return command.entity === "expense"
						? deleteExpense({ space, id: command.id })
						: deleteIncome({ space, id: command.id });
				case "expense": {
					const base = {
						space,
						amountCents: command.amountCents,
						note: command.note,
						envelope: command.envelope,
					};
					return command.id ? updateExpense({ ...base, id: command.id }) : addExpense(base);
				}
				case "income": {
					const base = { space, amountCents: command.amountCents, note: command.note };
					return command.id
						? updateIncome({ ...base, id: command.id })
						: addIncome({ ...base, extra: command.extra, forNextCycle: command.forNextCycle });
				}
			}
		},
		onSuccess: onDone,
	});

	function remove(entity: Kind, id: Movement["id"]) {
		action.mutate({ kind: "delete", entity, id });
	}

	const save: (values: SaveValues) => void = action.mutate;

	return {
		save,
		remove,
		pending: action.isPending,
		error: action.isError ? readError(action.error) : null,
	};
}
