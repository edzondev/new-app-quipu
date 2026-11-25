import { api } from "@quipu/backend/convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convex } from "@/lib/convex";

/**
 * Opens today's cycle of a space and suspends until it is open. The answer stays cached per space and day,
 * so only the first screen to ask pays for it. A sheet never calls it: the screen under it already did.
 */
export function useEnsureOpen(space: "personal" | "household", today: string) {
	useSuspenseQuery({
		queryKey: ["ensureOpen", space, today],
		queryFn: () => convex.mutation(api.cycles.ensureOpen, { space }),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
}
