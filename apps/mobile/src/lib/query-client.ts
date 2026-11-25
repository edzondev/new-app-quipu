import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { convex } from "@/lib/convex";

// Same ConvexReactClient as the auth provider, so queries, mutations and the cache share one connection.
// Convex pushes every change over its websocket: its queries are never stale and need no refetch wiring.
const convexQueryClient = new ConvexQueryClient(convex);

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryKeyHashFn: convexQueryClient.hashFn(),
			queryFn: convexQueryClient.queryFn(),
		},
	},
});
convexQueryClient.connect(queryClient);
