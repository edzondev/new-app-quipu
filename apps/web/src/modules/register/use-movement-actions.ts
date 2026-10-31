import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import type { Kind, Movement } from "./movement-draft";

type GoalId = FunctionReturnType<typeof api.goals.list>[number]["id"];

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
	  }
	| {
			kind: "saving";
			amountCents: number;
			note?: string;
			goalId: GoalId;
	  };

type Command = SaveValues | { kind: "delete"; entity: Exclude<Kind, "saving">; id: Movement["id"] };

function readError(error: unknown) {
	if (error instanceof ConvexError && typeof error.data === "string") return error.data;
	return "No pudimos guardarlo. Inténtalo otra vez.";
}

export function useMovementActions(space: "personal" | "household", onDone: () => void) {
	const addExpense = useConvexMutation(api.transactions.addExpense);
	const updateExpense = useConvexMutation(api.transactions.updateExpense);
	const deleteExpense = useConvexMutation(api.transactions.deleteExpense);
	const addIncome = useConvexMutation(api.transactions.addIncome);
	const updateIncome = useConvexMutation(api.transactions.updateIncome);
	const deleteIncome = useConvexMutation(api.transactions.deleteIncome);
	const addSaving = useConvexMutation(api.transactions.addSaving);

	const action = useMutation({
		mutationFn: async (command: Command) => {
			switch (command.kind) {
				case "delete":
					return command.entity === "expense"
						? deleteExpense({ space, id: command.id })
						: deleteIncome({ space, id: command.id });
				case "saving":
					return addSaving({
						space,
						amountCents: command.amountCents,
						note: command.note,
						goalId: command.goalId,
					});
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
					return command.id ? updateIncome({ ...base, id: command.id }) : addIncome(base);
				}
			}
		},
		onSuccess: onDone,
	});

	function remove(entity: Exclude<Kind, "saving">, id: Movement["id"]) {
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
