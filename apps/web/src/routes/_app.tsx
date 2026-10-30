import { createFileRoute, Outlet, redirect, retainSearchParams } from "@tanstack/react-router";
import { AppBar } from "#/components/app-bar";
import { getMyProfile } from "#/lib/profile";

export const Route = createFileRoute("/_app")({
	// Only `household` lives in the URL; personal is the default (no param).
	validateSearch: (search: Record<string, unknown>): { space?: "household" } =>
		search.space === "household" ? { space: "household" } : {},
	search: {
		middlewares: [retainSearchParams(["space"])],
	},
	beforeLoad: async ({ context, search }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await getMyProfile();
		if (!profile?.plan) throw redirect({ to: "/onboarding" });
		if (search.space === "household" && !profile.hasHousehold) {
			throw redirect({ search: (prev) => ({ ...prev, space: undefined }) });
		}
	},
	component: AppLayout,
});

function AppLayout() {
	return (
		<div className="min-h-svh bg-background text-foreground">
			<AppBar />
			<main className="mx-auto w-full max-w-280 px-6 py-9">
				<Outlet />
			</main>
		</div>
	);
}
