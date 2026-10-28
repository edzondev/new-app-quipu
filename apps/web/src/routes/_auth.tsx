import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { QuipuHeader } from "#/components/quipu-header";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/_auth")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) throw redirect({ to: "/home" });
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="min-h-svh bg-background text-foreground">
			<QuipuHeader />
			<main className="mx-auto w-full max-w-124 px-7 pb-16 pt-6 sm:pt-10">
				<Button
					variant="ghost"
					className="mb-9 h-8 gap-2 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
					render={<Link to="/" />}
				>
					<ArrowLeft strokeWidth={1.5} />
					Volver
				</Button>
				<Outlet />
			</main>
		</div>
	);
}
