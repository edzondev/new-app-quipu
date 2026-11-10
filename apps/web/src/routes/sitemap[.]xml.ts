import { createFileRoute } from "@tanstack/react-router";
import { INDEXABLE, SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: () =>
				INDEXABLE
					? new Response(
							`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>\n`,
							{ headers: { "Content-Type": "application/xml; charset=utf-8" } },
						)
					: new Response(null, { status: 404 }),
		},
	},
});
