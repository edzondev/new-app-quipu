import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { planRowLine } from "@quipu/backend/shared/billing";
import { cn } from "cn";
import type { FunctionReturnType } from "convex/server";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import { ACTION } from "#/lib/typography";
import { getCycleLines } from "../cycle-summary";
import { passkeysQuery } from "../auth-queries";
import { CycleDialog } from "./cycle-dialog";
import { SecurityDialog } from "./security-dialog";
import { SettingsGroup, SettingsRow } from "./settings-row";
import { SplitDialog } from "./split-dialog";

const LEGAL_LINKS = [
	{ title: "Política de privacidad", href: "https://quipu-finance.app/privacidad" },
	{ title: "Términos y condiciones", href: "https://quipu-finance.app/terminos" },
];

function describePasskeys(count: number | undefined) {
	if (count === undefined) return "Llaves de acceso y sesiones activas";
	if (count === 0) return "Sin llaves de acceso";
	return count === 1 ? "1 llave" : `${count} llaves`;
}

export function SettingsPage() {
	const today = useLimaDate();
	// Remount when the Lima day flips so the open cycle is read again.
	return <Settings key={today} today={today} />;
}

type Profile = NonNullable<FunctionReturnType<typeof api.profiles.myProfile>>;
type Plan = NonNullable<Profile["plan"]>;

export function ReloadError({ message }: { message: string }) {
	const queryClient = useQueryClient();
	return (
		<div role="alert" className="pt-6">
			<p className="text-sm text-warning-foreground">{message}</p>
			<Button
				variant="outline"
				size="xl"
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

function Loading() {
	return (
		<div role="status" className="space-y-6 pt-6" aria-busy="true" aria-label="Cargando">
			<Skeleton className="h-10 w-40" />
			<Skeleton className="h-20" />
			<Skeleton className="h-20" />
		</div>
	);
}

/** P8c: someone who joined without a Personal plan arms it from here. */
function NoPlanGroup() {
	return (
		<SettingsGroup title="Tu plan">
			<SettingsRow
				title="Plan personal"
				action={
					<Link to="/onboarding" search={{ redirect: "/settings" }} className={ACTION}>
						Armar
					</Link>
				}
			>
				<p>Tus sobres personales, cuando quieras.</p>
			</SettingsRow>
		</SettingsGroup>
	);
}

function SpaceRow() {
	const household = useQuery(convexQuery(api.household.get, {}));
	if (!household.data) return null;
	const { partnerName, invite } = household.data;
	return (
		<SettingsRow
			title="Nuestro espacio"
			action={
				<Link to="/space" className={ACTION}>
					Abrir
				</Link>
			}
		>
			<p>
				{partnerName ? `Con ${partnerName}` : invite ? "1 invitación pendiente" : "Sin pareja aún"}
			</p>
		</SettingsRow>
	);
}

/** The whole row opens Tu plan: the tap area of the link stretches over it. */
function PlusRow({ today }: { today: string }) {
	const status = useQuery(convexQuery(api.billing.status, {}));
	return (
		<SettingsRow
			title="Quipu Plus"
			action={
				<Link to="/settings/subscription" className={cn(ACTION, "static after:inset-0")}>
					Abrir
				</Link>
			}
		>
			{status.data ? <p>{planRowLine(status.data, today)}</p> : null}
		</SettingsRow>
	);
}

function Settings({ today }: { today: string }) {
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const passkeys = useQuery(passkeysQuery);

	if (profile.isError) return <ReloadError message="No pudimos cargar tus ajustes." />;
	if (!profile.data) return <Loading />;
	const { plan, nextPlan, hasHousehold } = profile.data;

	return (
		<div className="max-w-2xl">
			<header>
				<h1 className="font-heading text-[34px] leading-[1.1] font-normal tracking-[-0.01em]">
					Ajustes
				</h1>
				<p className="mt-1.5 text-sm leading-normal text-muted-foreground">Tu cuenta, sin ruido.</p>
			</header>

			{plan ? <PlanGroup today={today} plan={plan} nextPlan={nextPlan} /> : <NoPlanGroup />}

			<SettingsGroup title="Suscripción">
				<PlusRow today={today} />
			</SettingsGroup>

			<SettingsGroup title="Cuenta">
				{hasHousehold ? <SpaceRow /> : null}
				<SettingsRow title="Llaves y sesiones" action={<SecurityDialog />}>
					<p>{describePasskeys(passkeys.data?.length)}</p>
				</SettingsRow>
			</SettingsGroup>

			<SettingsGroup title="Legal">
				{LEGAL_LINKS.map((link) => (
					<SettingsRow
						key={link.href}
						title={link.title}
						action={
							<a href={link.href} target="_blank" rel="noopener noreferrer" className={ACTION}>
								Abrir ↗
							</a>
						}
					/>
				))}
			</SettingsGroup>
		</div>
	);
}

function PlanGroup({
	today,
	plan,
	nextPlan,
}: {
	today: string;
	plan: Plan;
	nextPlan: Plan | null;
}) {
	// Ajustes always edits the personal plan, whatever space the bar was on.
	const ensureOpen = useEnsureOpenCycle("personal", today);
	const home = useQuery(
		convexQuery(api.balances.getHome, ensureOpen.isSuccess ? { space: "personal", today } : "skip"),
	);
	if (ensureOpen.isError || home.isError)
		return <ReloadError message="No pudimos cargar tus ajustes." />;
	if (!home.data) return <Skeleton className="mt-10 h-40" />;
	const { split } = home.data;
	return (
		<SettingsGroup title="Tu plan">
			<SettingsRow
				title="Ciclo"
				action={
					<CycleDialog
						space="personal"
						plan={plan}
						nextPlan={nextPlan}
						currentEnd={home.data.endDate}
					/>
				}
			>
				{getCycleLines({ plan, nextPlan, currentEnd: home.data.endDate }).map((line) => (
					<p key={line}>{line}</p>
				))}
			</SettingsRow>
			<SettingsRow
				title="Reparto"
				action={<SplitDialog home={home.data} space="personal" label="Cambiar" />}
			>
				<p>
					Necesidades {split.needs}% · Gustos {split.wants}% · Ahorro {split.savings}%
				</p>
			</SettingsRow>
		</SettingsGroup>
	);
}
