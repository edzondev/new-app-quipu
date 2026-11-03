/** Cached by root beforeLoad; cleared on sign-out so a new session is not skipped. */
export const AUTH_TOKEN_QUERY_KEY = ["auth-token"] as const;
/** How long an unused auth-token cache entry is kept before garbage collection. */
export const AUTH_TOKEN_TTL_MS = 5 * 60 * 1000;
