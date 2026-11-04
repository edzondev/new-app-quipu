import type { QueryClient } from "@tanstack/react-query";

/** Cached by root beforeLoad; cleared on sign-in and sign-out so a stale value is not reused. */
export const AUTH_TOKEN_QUERY_KEY = ["auth-token"] as const;
/** How long an unused auth-token cache entry is kept before garbage collection. */
export const AUTH_TOKEN_TTL_MS = 5 * 60 * 1000;

/** Call right after a session is created: root beforeLoad may have cached `null` while signed out. */
export function clearAuthToken(queryClient: QueryClient) {
	queryClient.removeQueries({ queryKey: AUTH_TOKEN_QUERY_KEY });
}
