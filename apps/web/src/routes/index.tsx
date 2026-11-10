import { createFileRoute, redirect } from "@tanstack/react-router";
import { INDEXABLE, SITE_URL } from "#/lib/site";
import { LandingPage } from "#/modules/landing/landing-page";

const HOME_URL = new URL("/", SITE_URL).href;

export const Route = createFileRoute("/")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) throw redirect({ to: "/home" });
	},
	head: () => ({
		meta: [
			{ name: "robots", content: INDEXABLE ? "index, follow" : "noindex, follow" },
			{ property: "og:url", content: HOME_URL },
		],
		links: [{ rel: "canonical", href: HOME_URL }],
	}),
	component: LandingPage,
});
