import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { getLimaDate } from "@quipu/backend/shared/dates";
import {
	createFileRoute,
	Outlet,
	redirect,
	retainSearchParams,
	useRouterState,
} from "@tanstack/react-router";
import { AppBar } from "#/components/app-bar";
import { ensureOpenCycle } from "#/lib/ensure-open-cycle";
import { EmptyPersonal } from "#/modules/household/components/empty-personal";
import { CheckoutReturn } from "#/modules/plus/components/checkout-return";
import { PlusProvider } from "#/modules/plus/plus-provider";
import { RegisterProvider } from "#/modules/register/register-dialog";

export const Route = createFileRoute("/_app")({
	// Only `household` lives in the URL; personal is the default (no param).
	validateSearch: (
		search: Record<string, unknown>,
	): { space?: "household"; checkout?: "return" } => ({
		...(search.space === "household" ? { space: "household" } : {}),
		...(search.checkout === "return" ? { checkout: "return" } : {}),
	}),
	search: {
		middlewares: [retainSearchParams(["space"])],
	},
	beforeLoad: async ({ context, search, location }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient.query(convexQuery(api.profiles.myProfile, {}));
		// Someone who joined Nuestro espacio can arm their Personal later.
		if (!profile || (!profile.plan && !profile.hasHousehold)) throw redirect({ to: "/onboarding" });
		const hasPlan = profile.plan !== null;
		const space: "household" | "personal" = search.space === "household" ? "household" : "personal";
		const { hasHousehold } = profile;
		const today = getLimaDate();
		// Without a household only Inicio can show Nuestro espacio (the invite screen); other pages go back to Personal.
		if (space === "household" && !hasHousehold) {
			if (location.pathname !== "/home") {
				throw redirect({ search: (prev) => ({ ...prev, space: undefined }) });
			}
			return { space, today, hasHousehold, hasPlan };
		}
		// No personal plan means no personal cycle to open.
		if (space === "personal" && !hasPlan) return { space, today, hasHousehold, hasPlan };
		// Must run before child loaders that read requireOpenCycle data.
		await ensureOpenCycle(context.queryClient, context.convexQueryClient, space, today);
		return { space, today, hasHousehold, hasPlan };
	},
	component: AppLayout,
});

const PERSONAL_SCREENS = ["/home", "/movements", "/savings", "/commitments", "/progress"];

function AppLayout() {
	const { space, hasPlan } = Route.useRouteContext();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const needsPlan = space === "personal" && !hasPlan && PERSONAL_SCREENS.includes(pathname);
	return (
		<PlusProvider>
			<RegisterProvider>
				<div className="min-h-svh bg-background text-foreground">
					<AppBar />
					<main className="mx-auto w-full max-w-280 px-6 py-9">
						<CheckoutReturn />
						{needsPlan ? <EmptyPersonal /> : <Outlet />}
					</main>
				</div>
			</RegisterProvider>
		</PlusProvider>
	);
}
