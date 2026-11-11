import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { planCard } from "@quipu/backend/shared/billing";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { QuipuMark } from "#/components/quipu-mark";
import { ReloadError } from "#/components/reload-error";
import { Button } from "#/components/ui/button";
import { useLimaDate } from "#/hooks/use-lima-date";
import { useOpenPlus } from "../plus-provider";
import { usePortal } from "../use-portal";
import { PlusFeatures } from "./plus-features";

export function SubscriptionPage() {
	const today = useLimaDate();
	// Remount when the Lima day flips so the days left are counted again.
	return <Subscription key={today} today={today} />;
}

function Subscription({ today }: { today: string }) {
	const status = useQuery(convexQuery(api.billing.status, {}));
	const openPlus = useOpenPlus();
	const portal = usePortal();
	if (status.isError) return <ReloadError message="No pudimos cargar tu plan." />;
	if (!status.data) return null;
	const { title, line, action } = planCard(status.data, today);

	return (
		<div className="max-w-2xl">
			<nav aria-label="Ruta" className="flex items-center gap-2 text-[13px] text-muted-foreground">
				<Link to="/settings" className="py-3">
					Ajustes
				</Link>
				<span aria-hidden>/</span>
				<span>Suscripción</span>
			</nav>
			<h1 className="mt-1 font-heading text-[34px] leading-[1.1] font-normal tracking-[-0.01em]">
				Tu plan
			</h1>

			<section
				aria-label="Tu plan actual"
				className="relative mt-7 overflow-hidden rounded-2xl border border-border bg-card px-5 pt-6 pb-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-7"
			>
				<span
					aria-hidden
					className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#6FA8DC_33.3%,#F09A6B_33.3%_66.6%,#71b496_66.6%)]"
				/>
				<div>
					<QuipuMark className="mb-3 h-8 w-9" />
					<p className="text-xs text-muted-foreground">Tu plan actual</p>
					<h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-tight">{title}</h2>
					{line ? <p className="mt-2 text-sm text-muted-foreground">{line}</p> : null}
				</div>
				{action ? (
					<div className="mt-5 sm:mt-0 sm:shrink-0">
						<Button
							size="xl"
							className="w-full sm:w-auto"
							disabled={action.to === "portal" && portal.opening}
							onClick={(event) =>
								action.to === "portal" ? portal.start() : openPlus({ opener: event.currentTarget })
							}
						>
							{action.to === "portal" && portal.opening ? "Abriendo…" : action.label}
						</Button>
						{action.to === "portal" && portal.failed ? (
							<p role="alert" className="mt-2 text-xs text-warning-foreground">
								No se pudo abrir. Intenta de nuevo.
							</p>
						) : null}
					</div>
				) : null}
			</section>

			<section aria-labelledby="compare" className="mt-9">
				<h2 id="compare" className="mb-5 text-lg font-medium tracking-tight">
					Gratis y Quipu Plus
				</h2>
				<PlusFeatures heading="Funciones" />
				<p className="pt-4 text-sm text-muted-foreground">El resto de Quipu sigue gratis.</p>
			</section>

			<QuipuMark className="mx-auto mt-11 block h-[22px] w-6 opacity-65" />
		</div>
	);
}
