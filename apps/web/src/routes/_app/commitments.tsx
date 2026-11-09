import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { CommitmentsPage } from "#/modules/commitments/components/commitments-page";

export const Route = createFileRoute("/_app/commitments")({
	loader: async ({ context }) => {
		// Without a personal plan Personal has nothing to load.
		if (context.space === "personal" && !context.hasPlan) return;
		await context.queryClient.query(
			convexQuery(api.commitments.list, {
				space: context.space,
				today: context.today,
			}),
		);
	},

	component: CommitmentsPage,
});
