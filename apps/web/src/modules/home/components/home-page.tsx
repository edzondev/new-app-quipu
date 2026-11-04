import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { formatDaysLeft, formatRange } from "@quipu/backend/shared/dates";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import type { CommitmentItem } from "#/modules/commitments/commitment-view";
import type { Movement } from "#/modules/register/movement-draft";
import { useRegister } from "#/modules/register/register-dialog";
import { EnvelopeCards } from "./envelope-cards";
import { RecentMovements } from "./recent-movements";
import { UpcomingCommitments } from "./upcoming-commitments";

type Home = FunctionReturnType<typeof api.balances.getHome>;
type Space = "personal" | "household";

export function HomePage() {
	const today = useLimaDate();
	// Remount when the Lima day flips so ensureOpen runs again for the new cycle.
	return <Home key={today} today={today} />;
}

function Home({ today }: { today: string }) {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const queryClient = useQueryClient();
	const ensureOpen = useEnsureOpenCycle(space, today);
	const args: { space: Space; today: string } | "skip" = ensureOpen.isSuccess
		? { space, today }
		: "skip";

	const home = useQuery(convexQuery(api.balances.getHome, args));
	const commitments = useQuery(convexQuery(api.commitments.list, args));
	const movements = useQuery(convexQuery(api.transactions.list, args));
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));

	if (
		ensureOpen.isError ||
		home.isError ||
		commitments.isError ||
		movements.isError ||
		profile.isError
	) {
		return (
			<div role="alert" className="pt-6">
				<p className="text-sm text-warning-foreground">No pudimos cargar tu inicio.</p>
				<Button
					variant="outline"
					className="mt-3"
					onClick={() => {
						void queryClient.invalidateQueries();
					}}
				>
					Reintentar
				</Button>
			</div>
		);
	}
	if (!home.data) return <HomeSkeleton />;
	if (home.data.empty) return <EmptyCycle planIncomeCents={home.data.planIncomeCents} />;
	if (!commitments.data || !movements.data || !profile.data) return <HomeSkeleton />;
	return (
		<Overview
			home={home.data}
			name={profile.data.name}
			items={commitments.data.items}
			rows={movements.data.rows}
			space={space}
			today={today}
		/>
	);
}

function HomeSkeleton() {
	return (
		<div role="status" className="space-y-6 pt-6" aria-busy="true" aria-label="Cargando">
			<Skeleton className="h-3 w-28" />
			<Skeleton className="h-20 w-56" />
			<Skeleton className="h-3 w-64" />
			<div className="mt-10 space-y-4">
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
			</div>
		</div>
	);
}

function Overview({
	home,
	name,
	items,
	rows,
	space,
	today,
}: {
	home: Home;
	name: string;
	items: CommitmentItem[];
	rows: Movement[];
	space: Space;
	today: string;
}) {
	const [firstName = name] = name.trim().split(/\s+/);
	const [whole, decimals] = formatCents(home.dailyCents).split(".");

	return (
		<>
			<header>
				<h1 className="font-heading text-4xl font-medium tracking-tight">
					{space === "household" ? "Nuestro espacio" : `Hola, ${firstName}`}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Ciclo {formatRange(home.startDate, home.endDate)} · {formatDaysLeft(home.daysLeft)}
				</p>
			</header>

			<div className="mt-8 grid gap-10 lg:grid-cols-2">
				<section className="min-w-0">
					<p className="text-[13px] font-semibold text-muted-foreground">
						{space === "household" ? "Pueden gastar hoy juntos" : "Puedes gastar hoy"}
					</p>
					<p className="mt-2 font-mono text-[clamp(52px,15vw,80px)] leading-none tracking-tight tabular-nums">
						<span className="align-super text-[0.38em] text-muted-foreground">S/</span>
						{whole}
						<span className="text-[0.45em] text-muted-foreground">.{decimals}</span>
					</p>
					<p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
						Sin comprometer tu ciclo.
						<Formula home={home} />
					</p>
					{home.dailyCents === 0 ? (
						<p
							role="status"
							className="mt-4 rounded-2xl bg-warning/16 px-4 py-3 text-sm text-warning-foreground"
						>
							Hoy no queda para gastar. Tu Ahorro está protegido.
						</p>
					) : null}
				</section>

				<EnvelopeCards home={home} />
			</div>

			<UpcomingCommitments items={items} today={today} space={space} />
			<RecentMovements rows={rows} today={today} />
		</>
	);
}

function Formula({ home }: { home: Home }) {
	return (
		<Dialog>
			<DialogTrigger className="flex min-h-11 cursor-pointer items-center font-medium underline underline-offset-4 hover:text-foreground">
				¿Cómo se calcula?
			</DialogTrigger>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>¿Cómo se calcula?</DialogTitle>
					<DialogDescription>
						Lo libre en Necesidades y Gustos, menos lo que aún debes pagar, dividido entre los días
						que quedan (hoy cuenta).
					</DialogDescription>
				</DialogHeader>
				<DialogPanel>
					<dl className="space-y-2 text-sm tabular-nums">
						<div className="flex justify-between gap-4">
							<dt className="text-muted-foreground">Libre en Necesidades y Gustos</dt>
							<dd>S/ {formatCents(home.needsCents + home.wantsCents)}</dd>
						</div>
						{home.pendingCents > 0 ? (
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Compromisos por pagar</dt>
								<dd>−S/ {formatCents(home.pendingCents)}</dd>
							</div>
						) : null}
						<div className="flex justify-between gap-4">
							<dt className="text-muted-foreground">Días que quedan (hoy cuenta)</dt>
							<dd>÷ {home.daysLeft}</dd>
						</div>
					</dl>
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}

function EmptyCycle({ planIncomeCents }: { planIncomeCents: number }) {
	const openRegister = useRegister();
	const preset = planIncomeCents > 0 ? (planIncomeCents / 100).toFixed(2) : "";

	return (
		<section className="mt-10 pb-16 sm:mt-14">
			<h1 className="max-w-2xl font-heading text-3xl font-medium tracking-tight sm:text-5xl">
				Aún no registras dinero en este ciclo.
			</h1>
			<p className="mt-5 max-w-lg text-sm text-muted-foreground">
				Registra un ingreso y Quipu reparte tu dinero en tus sobres.
			</p>
			<div className="mt-8 flex flex-col items-start gap-3">
				{preset ? (
					<>
						<p className="text-sm text-muted-foreground">
							¿Ya te pagaron{" "}
							<span className="font-semibold tabular-nums text-foreground">
								S/ {formatCents(planIncomeCents)}
							</span>
							?
						</p>
						<Button
							size="lg"
							className="rounded-full px-7"
							onClick={() => openRegister({ kind: "income", amount: preset })}
						>
							Sí, ya me pagaron
						</Button>
						<button
							type="button"
							className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
							onClick={() => openRegister({ kind: "income" })}
						>
							Registrar otro monto
						</button>
					</>
				) : (
					<Button
						size="lg"
						className="rounded-full px-7"
						onClick={() => openRegister({ kind: "income" })}
					>
						Registrar ingreso
					</Button>
				)}
			</div>
		</section>
	);
}
