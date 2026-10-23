import { useRouteContext } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "#/lib/auth-client";
import { Route } from "../routes/__root";

// ConvexBetterAuthProvider 0.12.5 does not typecheck with better-auth 1.6.33.
let initialTokenUsed = false;

/* oxlint-disable react/set-state-in-effect, react-hooks/exhaustive-deps -- same dependencies as the library */
export function useConvexAuth() {
	const { token } = useRouteContext({ from: Route.id });
	const [cachedToken, setCachedToken] = useState<string | null>(
		initialTokenUsed ? null : (token ?? null),
	);
	const pendingTokenRef = useRef<Promise<string | null> | null>(null);
	useEffect(() => {
		if (!initialTokenUsed) initialTokenUsed = true;
	}, []);
	const { data: session, isPending: isSessionPending } = authClient.useSession();
	const sessionId = session?.session?.id;
	useEffect(() => {
		if (!session && !isSessionPending && cachedToken) setCachedToken(null);
	}, [session, isSessionPending]);
	const fetchAccessToken = useCallback(
		async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
			if (cachedToken && !forceRefreshToken) return cachedToken;
			if (!forceRefreshToken && pendingTokenRef.current) return pendingTokenRef.current;
			const pending = authClient.convex
				.token({ fetchOptions: { throw: false } })
				.then(({ data }) => {
					const next = data?.token || null;
					setCachedToken(next);
					return next;
				})
				.catch(() => {
					setCachedToken(null);
					return null;
				})
				.finally(() => {
					pendingTokenRef.current = null;
				});
			pendingTokenRef.current = pending;
			return pending;
		},
		[sessionId],
	);
	return useMemo(
		() => ({
			isLoading: isSessionPending && !cachedToken,
			isAuthenticated: Boolean(session?.session) || cachedToken !== null,
			fetchAccessToken,
		}),
		[isSessionPending, sessionId, fetchAccessToken, cachedToken],
	);
}
/* oxlint-enable react/set-state-in-effect, react-hooks/exhaustive-deps */
