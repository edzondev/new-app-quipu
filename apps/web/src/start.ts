import { createMiddleware, createStart } from "@tanstack/react-start";
import { buildContentSecurityPolicy } from "./lib/content-security-policy";

const securityHeaders = createMiddleware().server(async ({ next }) => {
	const result = await next();
	const convexUrl = import.meta.env.VITE_CONVEX_URL;
	if (!convexUrl) throw new Error("Falta VITE_CONVEX_URL");

	const { headers } = result.response;
	headers.set("Content-Security-Policy-Report-Only", buildContentSecurityPolicy(convexUrl));
	headers.set("Strict-Transport-Security", "max-age=86400");
	headers.set("X-Frame-Options", "DENY");
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	return result;
});

export const startInstance = createStart(() => ({
	requestMiddleware: [securityHeaders],
}));
