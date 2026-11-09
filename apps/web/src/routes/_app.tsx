import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { getLimaDate } from "@quipu/backend/shared/dates";
import { createFileRoute, Outlet, redirect, retainSearchParams } from "@tanstack/react-router";
import { AppBar } from "#/components/app-bar";
import { ensureOpenCycle } from "#/lib/ensure-open-cycle";
import { RegisterProvider } from "#/modules/register/register-dialog";

export const Route = createFileRoute("/_app")({
	// Only `household` lives in the URL; personal is the default (no param).
	validateSearch: (search: Record<string, unknown>): { space?: "household" } =>
		search.space === "household" ? { space: "household" } : {},
	search: {
		middlewares: [retainSearchParams(["space"])],
	},
	beforeLoad: async ({ context, search, location }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient.query(convexQuery(api.profiles.myProfile, {}));
		if (!profile?.plan) throw redirect({ to: "/onboarding" });
		const space: "household" | "personal" = search.space === "household" ? "household" : "personal";
		const { hasHousehold } = profile;
		const today = getLimaDate();
		// Without a household only Inicio can show Nuestro espacio (the invite screen); other pages go back to Personal.
		if (space === "household" && !hasHousehold) {
			if (location.pathname !== "/home") {
				throw redirect({ search: (prev) => ({ ...prev, space: undefined }) });
			}
			return { space, today, hasHousehold };
		}
		// Must run before child loaders that read requireOpenCycle data.
		await ensureOpenCycle(context.queryClient, context.convexQueryClient, space, today);
		return { space, today, hasHousehold };
	},
	component: AppLayout,
});

function AppLayout() {
	return (
		<RegisterProvider>
			<div className="min-h-svh bg-background text-foreground">
				<AppBar />
				<main className="mx-auto w-full max-w-280 px-6 py-9">
					<Outlet />
				</main>
			</div>
		</RegisterProvider>
	);
}
