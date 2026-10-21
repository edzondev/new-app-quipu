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
import { useCallback, useMemo, useState } from "react";
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

function useQuipuAuth() {
	const { token } = useRouteContext({ from: Route.id });
	const [cachedToken, setCachedToken] = useState<string | null>(token ?? null);
	const { data: session, isPending } = authClient.useSession();
	const sessionId = session?.session?.id;
	if (!sessionId && !isPending && cachedToken !== null) setCachedToken(null);

	const fetchAccessToken = useCallback(
		async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
			if (cachedToken && !forceRefreshToken && sessionId) return cachedToken;
			try {
				const { data } = await authClient.convex.token({ fetchOptions: { throw: false } });
				const siguiente = data?.token ?? null;
				setCachedToken(siguiente);
				return siguiente;
			} catch {
				setCachedToken(null);
				return null;
			}
		},
		[cachedToken, sessionId],
	);

	const tokenVisible = sessionId || isPending ? cachedToken : null;
	return useMemo(
		() => ({
			isLoading: isPending && !tokenVisible,
			isAuthenticated: Boolean(sessionId) || tokenVisible !== null,
			fetchAccessToken,
		}),
		[isPending, sessionId, tokenVisible, fetchAccessToken],
	);
}

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
