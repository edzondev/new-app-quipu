import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) throw redirect({ to: "/home" });
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="container mx-auto min-h-svh bg-background">
			<header className="flex w-full items-center px-7 py-8 sm:px-12 sm:py-10">
				<Link to="/" aria-label="Quipu, entrada" className="inline-flex items-center gap-2.5">
					<span className="font-display text-2xl">Quipu</span>
				</Link>
			</header>
			<main className="w-full max-w-xl md:max-w-7xl flex flex-col items-center">
				<Outlet />
			</main>
		</div>
	);
}
