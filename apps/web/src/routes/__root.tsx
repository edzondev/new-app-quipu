import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { ConvexProviderWithAuth } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "#/lib/auth-client";
import { getToken } from "#/lib/auth-server";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	convexQueryClient: ConvexQueryClient;
}

const getAuth = createServerFn({ method: "GET" }).handler(async () => await getToken());

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async (ctx) => {
		const token = await getAuth();
		if (token) ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
		return { isAuthenticated: !!token, token };
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Quipu",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	component: RootComponent,
	shellComponent: RootDocument,
});

function RootComponent() {
	const context = useRouteContext({ from: Route.id });
	return (
		<ConvexProviderWithAuth client={context.convexQueryClient.convexClient} useAuth={useQuipuAuth}>
			<Outlet />
		</ConvexProviderWithAuth>
	);
}

// Copia de useUseAuthFromBetterAuth: ConvexBetterAuthProvider 0.12.5 no tipa con better-auth 1.6.33.
let tokenInicialUsado = false;

/* oxlint-disable react/set-state-in-effect, react-hooks/exhaustive-deps -- mismas dependencias que la librería */
function useQuipuAuth() {
	const { token } = useRouteContext({ from: Route.id });
	const [cachedToken, setCachedToken] = useState<string | null>(
		tokenInicialUsado ? null : (token ?? null),
	);
	const pendingTokenRef = useRef<Promise<string | null> | null>(null);
	useEffect(() => {
		if (!tokenInicialUsado) tokenInicialUsado = true;
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
			const pendiente = authClient.convex
				.token({ fetchOptions: { throw: false } })
				.then(({ data }) => {
					const siguiente = data?.token || null;
					setCachedToken(siguiente);
					return siguiente;
				})
				.catch(() => {
					setCachedToken(null);
					return null;
				})
				.finally(() => {
					pendingTokenRef.current = null;
				});
			pendingTokenRef.current = pendiente;
			return pendiente;
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

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
