import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { ensureOpenQueryKey, runEnsureOpen } from "#/lib/ensure-open-cycle";

/**
 * Subscribes to the ensureOpen cache populated by `_app` beforeLoad.
 * Depends on today so a Lima day flip re-runs ensureOpen without a navigation.
 */
export function useEnsureOpenCycle(space: "personal" | "household", today: string) {
	const { convexQueryClient } = useRouteContext({ from: "__root__" });

	const ensureOpen = useQuery({
		queryKey: ensureOpenQueryKey(space, today),
		staleTime: Number.POSITIVE_INFINITY,
		queryFn: () => runEnsureOpen(convexQueryClient, space),
	});

	return { isSuccess: ensureOpen.isSuccess, isError: ensureOpen.isError };
}
