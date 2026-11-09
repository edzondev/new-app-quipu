import { Popover } from "@base-ui/react/popover";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { formatDay, formatDaysLeft, formatRange } from "@quipu/backend/shared/dates";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import { EYEBROW } from "#/lib/typography";
import type { CommitmentItem } from "#/modules/commitments/commitment-view";
import type { Movement } from "#/modules/register/movement-draft";
import { EmptyHousehold } from "#/modules/household/components/empty-household";
import { InviteStrip } from "#/modules/household/components/invite-strip";
import { JoinedNotice } from "#/modules/household/components/joined-notice";
import { useRegister } from "#/modules/register/register-dialog";
import { CloseNotice } from "./close-notice";
import { EnvelopeCards } from "./envelope-cards";
import { RecentMovements } from "./recent-movements";
import { UpcomingCommitments } from "./upcoming-commitments";

type HomeData = FunctionReturnType<typeof api.balances.getHome>;
type Space = "personal" | "household";
type HouseholdData = FunctionReturnType<typeof api.household.get>;

export function HomePage() {
	const today = useLimaDate();
	// Remount when the Lima day flips so ensureOpen runs again for the new cycle.
	return (
		<>
			<JoinedNotice />
			<Home key={today} today={today} />
		</>
	);
}

function Home({ today }: { today: string }) {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	// No household yet: its queries would fail, so none of them runs.
	if (space === "household" && profile.data && !profile.data.hasHousehold) {
		const [firstName = ""] = profile.data.name.trim().split(/s+/);
		return <EmptyHousehold firstName={firstName} hasPlus={profile.data.hasPlus} />;
	}
	return <SpaceHome space={space} today={today} />;
}

function SpaceHome({ space, today }: { space: Space; today: string }) {
	const queryClient = useQueryClient();
	const ensureOpen = useEnsureOpenCycle(space, today);
	const args: { space: Space; today: string } | "skip" = ensureOpen.isSuccess
		? { space, today }
		: "skip";

	const home = useQuery(convexQuery(api.balances.getHome, args));
	const commitments = useQuery(convexQuery(api.commitments.list, args));
	const movements = useQuery(convexQuery(api.transactions.list, args));
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const household = useQuery(convexQuery(api.household.get, space === "household" ? {} : "skip"));
	const closed = useQuery(
		convexQuery(
			api.cycles.getUnseenClosed,
			ensureOpen.isSuccess && space === "personal" ? { space } : "skip",
		),
	);

	if (
		ensureOpen.isError ||
		home.isError ||
		commitments.isError ||
		movements.isError ||
		profile.isError ||
		household.isError ||
		closed.isError
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
	const notice = closed.data ? (
		<CloseNotice key={closed.data.cycleId} closed={closed.data} />
	) : null;
	// Nuestro espacio shows its number (S/ 0.00) even with no income; registering there waits for U12b.
	if (home.data.empty && space === "personal") {
		return (
			<>
				{notice}
				<EmptyCycle planIncomeCents={home.data.planIncomeCents} />
			</>
		);
	}
	if (!commitments.data || !movements.data || !profile.data) return <HomeSkeleton />;
	if (space === "household" && !household.data) return <HomeSkeleton />;
	return (
		<>
			{notice}
			<Overview
				home={home.data}
				household={household.data ?? null}
				name={profile.data.name}
				items={commitments.data.items}
				rows={movements.data.rows}
				space={space}
				today={today}
			/>
		</>
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
	household,
	name,
	items,
	rows,
	space,
	today,
}: {
	home: HomeData;
	household: HouseholdData;
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
				<h1 className="font-heading text-[34px] leading-[1.1] font-normal tracking-[-0.01em]">
					{space === "household" ? "Nuestro espacio" : firstName ? `Hola, ${firstName}` : "Hola"}
				</h1>
				<p className="mt-1.5 truncate text-sm leading-normal text-muted-foreground">
					{household?.partnerName ? `Con ${household.partnerName} · ciclo` : "Ciclo"}{" "}
					{formatRange(home.startDate, home.endDate)} · {formatDaysLeft(home.daysLeft)}
				</p>
			</header>

			{household?.invite ? <InviteStrip invite={household.invite} firstName={firstName} /> : null}

			{home.earlyIncome ? (
				<p role="status" className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm">
					Sueldo registrado: empieza el {formatDay(home.earlyIncome.startsOn)}
				</p>
			) : null}

			<div className="mt-9 grid gap-14 lg:grid-cols-[1.1fr_1fr]">
				<section className="min-w-0">
					<div className="flex items-center gap-2">
						<p className={EYEBROW}>
							{space === "household" ? "Pueden gastar hoy juntos" : "Puedes gastar hoy"}
						</p>
						<Formula home={home} />
					</div>
					<p className="mt-2.5 flex items-start gap-1 font-mono text-[clamp(64px,13vw,112px)] leading-none tracking-[-0.03em]">
						<span className="mt-2.5 text-2xl tracking-normal text-muted-foreground">S/</span>
						<span>{whole}</span>
						<span className="mt-2 text-[0.41em] text-muted-foreground">.{decimals}</span>
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

				<EnvelopeCards home={home} space={space} />
			</div>

			<div className="mt-[52px] grid grid-cols-1 gap-14 border-t border-border/80 pt-7 lg:grid-cols-2">
				<UpcomingCommitments items={items} today={today} space={space} />
				<RecentMovements rows={rows} today={today} />
			</div>
		</>
	);
}

function Formula({ home }: { home: HomeData }) {
	const freeCents = Math.max(0, home.needsCents + home.wantsCents - home.pendingCents);

	return (
		<Popover.Root>
			<Popover.Trigger
				aria-label="Cómo se calcula"
				className="relative inline-flex size-[22px] flex-none cursor-pointer items-center justify-center rounded-full border-[1.5px] border-input text-xs leading-none font-bold text-muted-foreground outline-none after:absolute after:-inset-[11px] focus-visible:ring-2 focus-visible:ring-ring data-popup-open:border-transparent data-popup-open:bg-foreground data-popup-open:text-background"
			>
				i
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner side="bottom" sideOffset={12} className="z-50">
					<Popover.Popup className="w-[340px] max-w-[calc(100vw-48px)] rounded-2xl bg-background px-[18px] py-4 text-foreground shadow-lg ring-1 ring-border outline-none">
						<Popover.Arrow className="size-3 rotate-45 border-t border-l border-border bg-background data-[side=bottom]:-top-1.5" />
						<Popover.Title className="text-[15px] font-semibold">Cómo se calcula</Popover.Title>
						<p className="mt-1.5 text-[13px] leading-[1.45]">
							Lo libre de Necesidades y Gustos, menos lo que falta pagar, entre los días que quedan.
						</p>
						<dl className="mt-2.5 text-[13px] leading-[1.9] text-muted-foreground">
							<div className="flex justify-between gap-3">
								<dt>Libre en Necesidades + Gustos</dt>
								<dd className="font-mono text-foreground">S/ {formatCents(freeCents)}</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt>÷ días hasta el cierre ({formatDay(home.endDate)})</dt>
								<dd className="font-mono text-foreground">{home.daysLeft}</dd>
							</div>
							<div className="mt-1 flex justify-between gap-3 border-t border-border pt-1 font-semibold text-foreground">
								<dt>= puedes gastar hoy</dt>
								<dd className="font-mono">S/ {formatCents(home.dailyCents)}</dd>
							</div>
						</dl>
						<p className="mt-2 text-xs text-muted-foreground">
							Lo libre ya no incluye tus compromisos por pagar ni tu ahorro.
						</p>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

function EmptyCycle({ planIncomeCents }: { planIncomeCents: number | null }) {
	const openRegister = useRegister();
	const preset = planIncomeCents === null ? "" : (planIncomeCents / 100).toFixed(2);

	return (
		<section className="mt-10 pb-16 sm:mt-14">
			<h1 className="max-w-2xl font-heading text-3xl font-medium tracking-tight sm:text-5xl">
				Aún no registras dinero en este ciclo.
			</h1>
			<p className="mt-5 max-w-lg text-sm text-muted-foreground">
				Registra un ingreso y Quipu reparte tu dinero en tus sobres.
			</p>
			<div className="mt-8 flex flex-col items-start gap-3">
				{planIncomeCents !== null ? (
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
