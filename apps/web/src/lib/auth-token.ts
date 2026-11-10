/** Cached by root beforeLoad. Signing in or out reloads the page, which starts a fresh cache. */
export const AUTH_TOKEN_QUERY_KEY = ["auth-token"] as const;
/** How long an unused auth-token cache entry is kept before garbage collection. */
export const AUTH_TOKEN_TTL_MS = 5 * 60 * 1000;
