import { api } from "@quipu/backend/convex/_generated/api";
import type { Envelope } from "@quipu/backend/shared/budget";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import type { Row } from "@/features/movements/movement-rows";
import type { MovementKind } from "@/features/register/movement-kind";
import { convex } from "@/lib/convex";
import { readError } from "@/lib/read-error";
import { useSingleFlight } from "@/lib/use-single-flight";

type Id = Row["id"];

export type SaveValues =
	| {
			kind: "expense";
			id?: Id;
			amountCents: number;
			envelope: "needs" | "wants";
			note?: string;
	  }
	| {
			kind: "income";
			id?: Id;
			amountCents: number;
			note?: string;
			extra?: FunctionArgs<typeof api.transactions.addIncome>["extra"];
			forNextCycle?: boolean;
	  }
	| {
			kind: "contribution";
			id?: Id;
			amountCents: number;
			envelope: "needs" | "wants";
			toEnvelope: Envelope;
			note?: string;
	  };

type Command = SaveValues | { kind: "delete"; entity: MovementKind; id: Id };

// Registrar works in Personal until Nuestro espacio is connected (its «+» is off there).
const space: "personal" | "household" = "personal";

function send(command: Command) {
	switch (command.kind) {
		case "delete": {
			const { entity, id } = command;
			if (entity === "contribution")
				return convex.mutation(api.transactions.deleteContribution, { id });
			return entity === "expense"
				? convex.mutation(api.transactions.deleteExpense, { space, id })
				: convex.mutation(api.transactions.deleteIncome, { space, id });
		}
		case "expense": {
			const { id, amountCents, envelope, note } = command;
			const base = { space, amountCents, envelope, note };
			return id
				? convex.mutation(api.transactions.updateExpense, { ...base, id })
				: convex.mutation(api.transactions.addExpense, base);
		}
		case "income": {
			const { id, amountCents, note, extra, forNextCycle } = command;
			const base = { space, amountCents, note };
			return id
				? convex.mutation(api.transactions.updateIncome, { ...base, id })
				: convex.mutation(api.transactions.addIncome, { ...base, extra, forNextCycle });
		}
		case "contribution": {
			const { id, amountCents, envelope, toEnvelope, note } = command;
			const base = { amountCents, envelope, toEnvelope, note };
			return id
				? convex.mutation(api.transactions.updateContribution, { ...base, id })
				: convex.mutation(api.transactions.addContribution, base);
		}
	}
}

/** Saves or deletes a movement in Personal. Both resolve to whether it worked; why it did not is in `error`. */
export function useMovementActions() {
	const mutation = useMutation({ mutationFn: send });
	const run = useSingleFlight(mutation.mutateAsync);

	return {
		save: (values: SaveValues) => run(values),
		remove: (entity: MovementKind, id: Id) => run({ kind: "delete", entity, id }),
		pending: mutation.isPending,
		error: mutation.error ? readError(mutation.error) : null,
	};
}
