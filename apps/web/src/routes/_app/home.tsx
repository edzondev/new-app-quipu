import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "#/modules/home/components/home-page";

export const Route = createFileRoute("/_app/home")({
	loader: async ({ context }) => {
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
