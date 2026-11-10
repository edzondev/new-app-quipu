import { safeRedirect } from "@quipu/backend/shared/household";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { QuipuHeader } from "#/components/quipu-header";
import { Button } from "#/components/ui/button";
import { Cords } from "#/modules/landing/components/cords";

export const Route = createFileRoute("/_auth")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: safeRedirect(search.redirect),
	}),
	beforeLoad: ({ context, search }) => {
		if (context.isAuthenticated) throw redirect({ to: safeRedirect(search.redirect) });
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="relative min-h-svh overflow-hidden bg-background text-foreground">
			<Cords className="top-1/2 h-155 w-215 opacity-20 sm:w-[calc(100%+240px)] min-[1500px]:w-[1500px]" />
			<QuipuHeader />
			<main className="relative mx-auto w-full max-w-124 px-7 pb-16 pt-6 sm:pt-10">
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
