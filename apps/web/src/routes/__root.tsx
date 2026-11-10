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
import { ToastProvider } from "#/components/ui/toast";
import { authClient } from "#/lib/auth-client";
import { getToken } from "#/lib/auth-server";
import { AUTH_TOKEN_QUERY_KEY, AUTH_TOKEN_TTL_MS } from "#/lib/auth-token";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL, THEME_COLOR } from "#/lib/site";
import { THEME_SCRIPT } from "#/lib/theme";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

const OG_IMAGE = new URL("/og-image.jpg", SITE_URL).href;

interface MyRouterContext {
	queryClient: QueryClient;
	convexQueryClient: ConvexQueryClient;
}

const getAuth = createServerFn({ method: "GET" }).handler(async () => await getToken());

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async ({ context }) => {
		// Token is served from cache; after AUTH_TOKEN_TTL_MS without observers it is GC'd.
		const token = await context.queryClient.query({
			queryKey: AUTH_TOKEN_QUERY_KEY,
			// React Query rejects undefined; treat a missing session as null.
			queryFn: async () => (await getAuth()) ?? null,
			gcTime: AUTH_TOKEN_TTL_MS,
			staleTime: "static",
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
			{ title: SITE_TITLE },
			{ name: "description", content: SITE_DESCRIPTION },
			{ name: "robots", content: "noindex, follow" },
			{ name: "theme-color", content: THEME_COLOR },
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: "Quipu" },
			{ property: "og:locale", content: "es_PE" },
			{ property: "og:title", content: SITE_TITLE },
			{ property: "og:description", content: SITE_DESCRIPTION },
			{ property: "og:image", content: OG_IMAGE },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: SITE_TITLE },
			{ name: "twitter:description", content: SITE_DESCRIPTION },
			{ name: "twitter:image", content: OG_IMAGE },
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
		],
		scripts: [{ children: THEME_SCRIPT }],
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
		// The theme script adds `dark` before React hydrates, so the class differs from the server HTML.
		<html lang="es-PE" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ToastProvider position="top-center" timeout={3000}>
					{children}
				</ToastProvider>
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
