import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import * as Haptics from "expo-haptics";
import { convex } from "@/lib/convex";
import { readError } from "@/lib/read-error";
import { useSingleFlight } from "@/lib/use-single-flight";

type Space = "personal" | "household";
type Id = FunctionReturnType<typeof api.commitments.list>["items"][number]["id"];

type Command =
	| { kind: "save"; id?: Id; fields: Omit<FunctionArgs<typeof api.commitments.add>, "space"> }
	| { kind: "remove"; id: Id }
	| { kind: "pay"; id: Id; amountCents: number }
	| { kind: "setDue"; id: Id; month: string; day: number }
	| { kind: "clearDue"; id: Id };

function send(space: Space, command: Command) {
	switch (command.kind) {
		case "save": {
			const { id, fields } = command;
			return id
				? convex.mutation(api.commitments.update, { space, id, ...fields })
				: convex.mutation(api.commitments.add, { space, ...fields });
		}
		case "remove":
			return convex.mutation(api.commitments.remove, { space, id: command.id });
		case "pay": {
			const { id, amountCents } = command;
			return convex.mutation(api.commitments.markPaid, { space, id, amountCents });
		}
		case "setDue": {
			const { id, month, day } = command;
			return convex.mutation(api.commitments.setDueThisMonth, { space, id, month, day });
		}
		case "clearDue":
			return convex.mutation(api.commitments.clearDueThisMonth, { space, id: command.id });
	}
}

/**
 * Writes a commitment of `space`. `run` resolves to whether it worked and vibrates only then; why it
 * failed is in `error`. Each sheet has its own, so an error does not follow into the next one.
 */
export function useCommitmentActions(space: Space) {
	const mutation = useMutation({ mutationFn: (command: Command) => send(space, command) });
	const runOnce = useSingleFlight(mutation.mutateAsync);

	async function run(command: Command) {
		const ok = await runOnce(command);
		if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		return ok;
	}

	return {
		run,
		pending: mutation.isPending,
		error: mutation.error ? readError(mutation.error) : null,
	};
}
