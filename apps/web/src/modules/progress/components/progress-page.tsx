import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import { loadError } from "../progress-text";
import { CyclesPage, RowsSkeleton } from "./cycles-page";

type Space = "personal" | "household";

export function ProgressPage() {
	const today = useLimaDate();
	const { space = "personal" } = useSearch({ from: "/_app" });
	// Remount when the Lima day flips so ensureOpen closes the cycle that just ended.
	return <Progress key={`${space}-${today}`} today={today} space={space} />;
}

const bigNumber = "font-heading text-5xl font-medium tracking-tight text-foreground tabular-nums";

function Streak({
	streak,
	exact,
	together,
}: {
	streak: number;
	exact: boolean;
	together: boolean;
}) {
	if (streak === 0) {
		return (
			<p className="mt-2 text-sm text-muted-foreground">
				{together
					? "Aún no llevan ciclos seguidos sin pasarse."
					: "Todavía no tienes ciclos seguidos sin quedarte sin margen"}
			</p>
		);
	}
	const atLeast = exact ? null : <span className="text-xs">Al menos</span>;
	if (together) {
		return (
			<p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
				Llevan {atLeast}
				<span className={bigNumber}>{streak}</span>
				{streak === 1 ? "ciclo sin pasarse." : "ciclos seguidos sin pasarse."}
			</p>
		);
	}
	return (
		<p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
			{atLeast}
			<span className={bigNumber}>{streak}</span>
			{streak === 1 ? "ciclo seguido" : "ciclos seguidos"} sin quedarte sin margen
		</p>
	);
}

function Progress({ today, space }: { today: string; space: Space }) {
	const together = space === "household";
	const ensureOpen = useEnsureOpenCycle(space, today);
	const streak = useQuery(
		convexQuery(api.progress.streak, ensureOpen.isSuccess ? { space } : "skip"),
	);

	if (ensureOpen.isError || streak.isError) {
		return (
			<p role="alert" className="pt-6 text-sm text-warning-foreground">
				{loadError(together)}
			</p>
		);
	}
	if (!streak.data) return <RowsSkeleton />;

	return (
		<>
			<header>
				<h1 className="font-heading text-4xl font-medium tracking-tight">Progreso</h1>
				{streak.data.hasActive ? <Streak {...streak.data} together={together} /> : null}
			</header>
			<CyclesPage space={space} />
		</>
	);
}
