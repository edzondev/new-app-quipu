import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "#/modules/home/components/home-page";

export const Route = createFileRoute("/_app/home")({
	// Set by joining a household: Inicio shows a confirmation for 3 seconds and takes it out.
	validateSearch: (search: Record<string, unknown>): { joined?: true } =>
		search.joined === true || search.joined === "true" ? { joined: true } : {},
	loader: async ({ context }) => {
		// Nuestro espacio without a household has no cycle to load: Inicio shows the invite screen.
		if (context.space === "household" && !context.hasHousehold) return;
		const args = { space: context.space, today: context.today };
		await Promise.all([
			context.queryClient.query(convexQuery(api.balances.getHome, args)),
			context.queryClient.query(convexQuery(api.commitments.list, args)),
			context.queryClient.query(convexQuery(api.transactions.list, args)),
			context.space === "personal"
				? context.queryClient.query(convexQuery(api.cycles.getUnseenClosed, { space: "personal" }))
				: undefined,
		]);
	},
	component: HomePage,
});
