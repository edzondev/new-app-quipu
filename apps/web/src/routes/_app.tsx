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
	beforeLoad: async ({ context, search }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient.query(convexQuery(api.profiles.myProfile, {}));
		if (!profile?.plan) throw redirect({ to: "/onboarding" });
		if (search.space === "household" && !profile.hasHousehold) {
			throw redirect({ search: (prev) => ({ ...prev, space: undefined }) });
		}
		const space: "household" | "personal" = search.space === "household" ? "household" : "personal";
		const today = getLimaDate();
		// Must run before child loaders that read requireOpenCycle data.
		await ensureOpenCycle(context.queryClient, context.convexQueryClient, space, today);
		return { space, today };
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
