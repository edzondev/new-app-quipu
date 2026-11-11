import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { isEmptyHousehold } from "#/lib/empty-household";
import { ProgressPage } from "#/modules/progress/components/progress-page";

export const Route = createFileRoute("/_app/progress")({
	loader: async ({ context }) => {
		if (isEmptyHousehold(context)) return;
		// Without a personal plan Personal has nothing to load.
		if (context.space === "personal" && !context.hasPlan) return;
		const args = { space: context.space };
		await Promise.all([
			context.queryClient.query(convexQuery(api.progress.streak, args)),
			context.queryClient.query(convexQuery(api.progress.list, args)),
		]);
	},
	component: ProgressPage,
});
