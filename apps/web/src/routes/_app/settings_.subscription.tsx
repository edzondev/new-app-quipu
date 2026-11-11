import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionPage } from "#/modules/plus/components/subscription-page";

// The `_` keeps it out of `settings.tsx`, which has no Outlet. No plan needed: someone who joined a household can open it.
export const Route = createFileRoute("/_app/settings_/subscription")({
	loader: async ({ context }) => {
		await context.queryClient.query(convexQuery(api.billing.status, {}));
	},
	component: SubscriptionPage,
});
