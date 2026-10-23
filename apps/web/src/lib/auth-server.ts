import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

type ReactStartAuth = ReturnType<typeof convexBetterAuthReactStart>;

let reactStartAuth: ReactStartAuth | undefined;

function getReactStartAuth() {
	if (reactStartAuth) return reactStartAuth;
	const convexUrl = import.meta.env.VITE_CONVEX_URL;
	const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL;
	if (!convexUrl || !convexSiteUrl) {
		throw new Error("Missing VITE_CONVEX_URL and VITE_CONVEX_SITE_URL");
	}
	reactStartAuth = convexBetterAuthReactStart({ convexUrl, convexSiteUrl });
	return reactStartAuth;
}

export const handler: ReactStartAuth["handler"] = (request) => getReactStartAuth().handler(request);
export const getToken: ReactStartAuth["getToken"] = () => getReactStartAuth().getToken();
