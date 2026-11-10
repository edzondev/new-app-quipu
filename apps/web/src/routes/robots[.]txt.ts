import { createFileRoute } from "@tanstack/react-router";
import { INDEXABLE, SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(
					`User-agent: *\nAllow: /\n${INDEXABLE ? `Sitemap: ${SITE_URL}/sitemap.xml\n` : ""}`,
					{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
				),
		},
	},
});
