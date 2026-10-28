import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMyProfile } from "#/lib/profile";

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ context }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await getMyProfile();
		if (!profile?.plan) throw redirect({ to: "/onboarding" });
	},
});
