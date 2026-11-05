import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { SavingsPage } from "#/modules/savings/components/savings-page";

export const Route = createFileRoute("/_app/savings")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.query(
				convexQuery(api.goals.fund, { space: context.space, today: context.today }),
			),
			context.queryClient.query(convexQuery(api.balances.getBalances, { space: context.space })),
		]);
	},
	component: SavingsPage,
});
