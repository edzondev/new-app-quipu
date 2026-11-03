import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "#/modules/home/components/home-page";

export const Route = createFileRoute("/_app/home")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			convexQuery(api.balances.getHome, { space: context.space, today: context.today }),
		);
	},
	component: HomePage,
});
