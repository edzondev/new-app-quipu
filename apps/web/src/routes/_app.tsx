import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ context }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient.query(convexQuery(api.profiles.myProfile, {}));
		if (!profile?.plan) throw redirect({ to: "/onboarding" });
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			Hello "/_app"!
			<Outlet />
		</div>
	);
}
