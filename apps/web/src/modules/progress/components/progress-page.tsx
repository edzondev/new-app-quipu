import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { LOAD_ERROR } from "../progress-text";
import { CyclesPage, RowsSkeleton } from "./cycles-page";

export function ProgressPage() {
	const today = useLimaDate();
	// Remount when the Lima day flips so ensureOpen closes the cycle that just ended.
	return <Progress key={today} today={today} />;
}

function Streak({ streak, exact }: { streak: number; exact: boolean }) {
	if (streak === 0) {
		return (
			<p className="mt-2 text-sm text-muted-foreground">
				Todavía no tienes ciclos seguidos sin quedarte sin margen
			</p>
		);
	}
	return (
		<p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
			{exact ? null : <span className="text-xs">Al menos</span>}
			<span className="font-heading text-5xl font-medium tracking-tight text-foreground tabular-nums">
				{streak}
			</span>
			{streak === 1 ? "ciclo seguido" : "ciclos seguidos"} sin quedarte sin margen
		</p>
	);
}

function Progress({ today }: { today: string }) {
	const ensureOpen = useEnsureOpenCycle("personal", today);
	const streak = useQuery(convexQuery(api.progress.streak, ensureOpen.isSuccess ? {} : "skip"));

	if (ensureOpen.isError || streak.isError) {
		return (
			<p role="alert" className="pt-6 text-sm text-warning-foreground">
				{LOAD_ERROR}
			</p>
		);
	}
	if (!streak.data) return <RowsSkeleton />;

	return (
		<div className="mx-auto w-full max-w-150">
			<header>
				<h1 className="font-heading text-4xl font-medium tracking-tight">Progreso</h1>
				{streak.data.hasActive ? <Streak {...streak.data} /> : null}
			</header>
			{streak.data.hasActive ? (
				<h2 className="mt-10 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
					Ciclos cerrados
				</h2>
			) : null}
			<CyclesPage />
		</div>
	);
}
