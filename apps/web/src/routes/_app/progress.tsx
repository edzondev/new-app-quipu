import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProgressPage } from "#/modules/progress/components/progress-page";

export const Route = createFileRoute("/_app/progress")({
	beforeLoad: ({ context }) => {
		// The queries take no space: Progreso only knows Personal.
		if (context.space === "household") {
			throw redirect({ to: "/progress", search: (prev) => ({ ...prev, space: undefined }) });
		}
	},
	loader: async ({ context }) => {
		// Without a personal plan Personal has nothing to load.
		if (context.space === "personal" && !context.hasPlan) return;
		await Promise.all([
			context.queryClient.query(convexQuery(api.progress.streak, {})),
			context.queryClient.query(convexQuery(api.progress.list, {})),
		]);
	},
	component: ProgressPage,
});
