import type { ConvexQueryClient } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import type { QueryClient } from "@tanstack/react-query";

type Space = "personal" | "household";

/** Shared cache key so beforeLoad and the client effect share one ensureOpen per day+space. */
export function ensureOpenQueryKey(space: Space, today: string) {
	return ["ensureOpen", space, today] as const;
}

export async function runEnsureOpen(convexQueryClient: ConvexQueryClient, space: Space) {
	if (import.meta.env.SSR) {
		const http = convexQueryClient.serverHttpClient;
		if (!http) throw new Error("Convex HTTP client missing during SSR");
		return http.mutation(api.cycles.ensureOpen, { space });
	}
	return convexQueryClient.convexClient.mutation(api.cycles.ensureOpen, { space });
}

/** Ensures today's cycle is open; caches the promise so navigations do not re-mutate. */
export function ensureOpenCycle(
	queryClient: QueryClient,
	convexQueryClient: ConvexQueryClient,
	space: Space,
	today: string,
) {
	return queryClient.ensureQueryData({
		queryKey: ensureOpenQueryKey(space, today),
		staleTime: Number.POSITIVE_INFINITY,
		queryFn: () => runEnsureOpen(convexQueryClient, space),
	});
}
