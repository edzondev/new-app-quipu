import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { SpaceSettings } from "#/modules/household/components/space-settings";

export const Route = createFileRoute("/_app/space")({
	beforeLoad: ({ context }) => {
		// The settings of the household: without one there is nothing to open.
		if (!context.hasHousehold) throw redirect({ to: "/settings" });
	},
	loader: async ({ context }) => {
		await context.queryClient.query(convexQuery(api.household.get, {}));
	},
	component: SpaceSettings,
});
