import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { ensureOpenCycle } from "#/lib/ensure-open-cycle";
import { SettingsPage } from "#/modules/settings/components/settings-page";

export const Route = createFileRoute("/_app/settings")({
	loader: async ({ context }) => {
		// The plan and split are always the personal ones, even with `?space=household` in the URL.
		await ensureOpenCycle(
			context.queryClient,
			context.convexQueryClient,
			"personal",
			context.today,
		);
		await Promise.all([
			context.queryClient.query(convexQuery(api.profiles.myProfile, {})),
			context.queryClient.query(
				convexQuery(api.balances.getHome, { space: "personal", today: context.today }),
			),
		]);
	},
	component: SettingsPage,
});
