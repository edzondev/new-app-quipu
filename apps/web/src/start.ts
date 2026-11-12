import { createMiddleware, createStart } from "@tanstack/react-start";
import { buildContentSecurityPolicy } from "./lib/content-security-policy";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("Falta VITE_CONVEX_URL");
const contentSecurityPolicy = buildContentSecurityPolicy(convexUrl);

const securityHeaders = createMiddleware().server(async ({ next }) => {
	const result = await next();
	const response = new Response(result.response.body, result.response);
	response.headers.set("Content-Security-Policy-Report-Only", contentSecurityPolicy);
	response.headers.set("Strict-Transport-Security", "max-age=86400");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	return response;
});

export const startInstance = createStart(() => ({
	requestMiddleware: [securityHeaders],
}));
