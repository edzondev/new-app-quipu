import type { AuthClient } from "@convex-dev/better-auth/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { authClient } from "#/lib/auth-client";
import { getToken } from "#/lib/auth-server";
import { AUTH_TOKEN_QUERY_KEY, AUTH_TOKEN_STALE_TIME_MS } from "#/lib/auth-token";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	convexQueryClient: ConvexQueryClient;
}

const getAuth = createServerFn({ method: "GET" }).handler(async () => await getToken());

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async ({ context }) => {
		const token = await context.queryClient.ensureQueryData({
			queryKey: AUTH_TOKEN_QUERY_KEY,
			// React Query rejects undefined; treat a missing session as null.
			queryFn: async () => (await getAuth()) ?? null,
			staleTime: AUTH_TOKEN_STALE_TIME_MS,
		});
		// serverHttpClient is only used during SSR; the browser uses the Convex websocket client.
		if (import.meta.env.SSR && token) {
			context.convexQueryClient.serverHttpClient?.setAuth(token);
		}
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
		<ConvexBetterAuthProvider
			client={context.convexQueryClient.convexClient}
			authClient={authClient as unknown as AuthClient}
			initialToken={context.token}
		>
			<Outlet />
		</ConvexBetterAuthProvider>
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
