/** Cached by root beforeLoad; cleared on sign-out so a new session is not skipped. */
export const AUTH_TOKEN_QUERY_KEY = ["auth-token"] as const;
export const AUTH_TOKEN_STALE_TIME_MS = 5 * 60 * 1000;
