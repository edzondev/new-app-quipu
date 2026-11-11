import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { getLimaDate } from "@quipu/backend/shared/dates";
import { firstName } from "@quipu/backend/shared/household";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	redirect,
	retainSearchParams,
	useRouterState,
} from "@tanstack/react-router";
import { AppBar } from "#/components/app-bar";
import { isEmptyHousehold } from "#/lib/empty-household";
import { ensureOpenCycle } from "#/lib/ensure-open-cycle";
import { EmptyHousehold } from "#/modules/household/components/empty-household";
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
	beforeLoad: async ({ context, search }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient.query(convexQuery(api.profiles.myProfile, {}));
		// Someone who joined Nuestro espacio can arm their Personal later.
		if (!profile || (!profile.plan && !profile.hasHousehold)) throw redirect({ to: "/onboarding" });
		const hasPlan = profile.plan !== null;
		const space: "household" | "personal" = search.space === "household" ? "household" : "personal";
		const { hasHousehold } = profile;
		const today = getLimaDate();
		// Nuestro espacio without a household stays on the same page: the layout shows the invite screen.
		if (isEmptyHousehold({ space, hasHousehold })) return { space, today, hasHousehold, hasPlan };
		// No personal plan means no personal cycle to open.
		if (space === "personal" && !hasPlan) return { space, today, hasHousehold, hasPlan };
		// Must run before child loaders that read requireOpenCycle data.
		await ensureOpenCycle(context.queryClient, context.convexQueryClient, space, today);
		return { space, today, hasHousehold, hasPlan };
	},
	component: AppLayout,
});

// The pages that show one space. Progreso only knows Personal: its route sends Nuestro espacio back there.
const SPACE_SCREENS = ["/home", "/movements", "/savings", "/commitments"];
const PERSONAL_SCREENS = [...SPACE_SCREENS, "/progress"];

function AppLayout() {
	const context = Route.useRouteContext();
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const needsPlan =
		context.space === "personal" && !context.hasPlan && PERSONAL_SCREENS.includes(pathname);
	const needsHousehold = isEmptyHousehold(context) && SPACE_SCREENS.includes(pathname);
	return (
		<PlusProvider>
			<RegisterProvider>
				<div className="min-h-svh bg-background text-foreground">
					<AppBar />
					<main className="mx-auto w-full max-w-280 px-6 py-9">
						<CheckoutReturn />
						{needsPlan ? <EmptyPersonal /> : null}
						{needsHousehold && profile.data ? (
							<EmptyHousehold
								firstName={firstName(profile.data.name)}
								hasPlus={profile.data.hasPlus}
							/>
						) : null}
						{needsPlan || needsHousehold ? null : <Outlet />}
					</main>
				</div>
			</RegisterProvider>
		</PlusProvider>
	);
}
