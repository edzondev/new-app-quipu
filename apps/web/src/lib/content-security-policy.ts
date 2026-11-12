/** Builds the CSP text for Report-Only. Host comes from VITE_CONVEX_URL. */
export function buildContentSecurityPolicy(convexUrl: string): string {
	const host = new URL(convexUrl).host;
	return [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
		"frame-src https://challenges.cloudflare.com",
		`connect-src 'self' https://${host} wss://${host}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"font-src 'self'",
		"frame-ancestors 'none'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	].join("; ");
}
