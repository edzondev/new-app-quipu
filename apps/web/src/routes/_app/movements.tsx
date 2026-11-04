import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { MovementsPage } from "#/modules/movements/components/movements-page";

export const Route = createFileRoute("/_app/movements")({
	loader: async ({ context }) => {
		const args = { space: context.space, today: context.today };
		await Promise.all([
			context.queryClient.query(convexQuery(api.transactions.list, args)),
			context.queryClient.query(convexQuery(api.balances.getHome, args)),
		]);
	},
	component: MovementsPage,
});
