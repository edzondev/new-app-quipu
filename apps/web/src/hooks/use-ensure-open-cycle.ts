import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

/** Ensures today's cycle is open before any budget read that needs requireOpenCycle. */
export function useEnsureOpenCycle(space: "personal" | "household") {
	const ensureOpen = useMutation({ mutationFn: useConvexMutation(api.cycles.ensureOpen) });
	const { mutate } = ensureOpen;

	// Close a cycle that ended while the app was closed before reading the number.
	useEffect(() => {
		mutate({ space });
	}, [mutate, space]);

	return { isSuccess: ensureOpen.isSuccess, isError: ensureOpen.isError };
}
