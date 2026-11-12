import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DeletionPendingPage } from "#/modules/account-deletion/deletion-pending-page";

export const Route = createFileRoute("/eliminando-cuenta")({
	beforeLoad: async ({ context }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient
			.query(convexQuery(api.profiles.myProfile, {}))
			.catch(() => undefined);
		if (profile !== undefined && !profile?.deletionRunsAt) throw redirect({ to: "/home" });
	},
	head: () => ({ meta: [{ title: "Quipu — Eliminando tu cuenta" }] }),
	component: DeletionPendingPage,
});
