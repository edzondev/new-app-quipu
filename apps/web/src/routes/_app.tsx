import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
	beforeLoad: ({ context }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
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
