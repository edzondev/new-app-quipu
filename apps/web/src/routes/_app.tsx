import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api.js";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ context, location }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient.ensureQueryData(
			convexQuery(api.profiles.myProfile, {}),
		);
		if (profile && profile.currentStep !== "done" && !location.pathname.startsWith("/onboarding")) {
			throw redirect({
				to: "/onboarding/$step",
				params: { step: profile.currentStep },
			});
		}
		return { profile };
	},
	component: AppLayout,
});

function AppLayout() {
	return (
		<>
			<Outlet />
			<p className="salir">
				<button
					type="button"
					className="enlace"
					onClick={() => {
						void authClient.signOut({
							fetchOptions: { onSuccess: () => location.reload() },
						});
					}}
				>
					Salir
				</button>
			</p>
		</>
	);
}
