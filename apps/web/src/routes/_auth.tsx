import { safeRedirect } from "@quipu/backend/shared/household";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { QuipuHeader } from "#/components/quipu-header";
import { ThemeToggle } from "#/components/theme-toggle";
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

const LEGAL = [
	{ title: "Términos", href: "https://quipu-finance.app/terminos" },
	{ title: "Privacidad", href: "https://quipu-finance.app/privacidad" },
];

function RouteComponent() {
	return (
		<div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
			>
				<div className="absolute inset-x-0 top-[20%] h-3/5 bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--envelope-savings)_8%,transparent),transparent_68%)] blur-[40px] sm:inset-x-[18%]" />
				<Cords className="top-1/2 h-155 w-215 -translate-y-1/2 sm:w-[calc(100%+240px)] min-[1500px]:w-[1500px]" />
			</div>
			<QuipuHeader>
				<ThemeToggle />
			</QuipuHeader>
			<main className="flex flex-1 items-center justify-center px-5 py-6 sm:py-9">
				<div className="w-full max-w-108 rounded-[22px] bg-[linear-gradient(130deg,color-mix(in_srgb,var(--envelope-needs)_50%,var(--input)),var(--input)_38%,color-mix(in_srgb,var(--envelope-savings)_42%,var(--input))_78%,color-mix(in_srgb,var(--envelope-wants)_50%,var(--input)))] p-px shadow-2xl shadow-foreground/10">
					<div className="rounded-[21px] bg-background px-6 py-8 sm:rounded-3xl sm:p-9">
						<Outlet />
					</div>
				</div>
			</main>
			<footer className="flex h-16 items-center justify-center gap-6">
				{LEGAL.map(({ title, href }) => (
					<a
						key={href}
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex min-h-11 min-w-11 items-center justify-center text-[11px] text-muted-foreground hover:text-foreground"
					>
						{title}
					</a>
				))}
			</footer>
		</div>
	);
}
