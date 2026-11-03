import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { formatDayHeading, formatRange } from "@quipu/backend/shared/dates";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import type { Movement } from "#/modules/register/movement-draft";
import { MovementRow } from "./movement-row";

const FILTERS = [
	{ id: "all", label: "Todos", match: () => true },
	{ id: "needs", label: ENVELOPE_LABELS.needs, match: (row: Movement) => row.envelope === "needs" },
	{ id: "wants", label: ENVELOPE_LABELS.wants, match: (row: Movement) => row.envelope === "wants" },
	{
		id: "savings",
		label: ENVELOPE_LABELS.savings,
		match: (row: Movement) => row.envelope === "savings",
	},
	{ id: "income", label: "Ingresos", match: (row: Movement) => row.kind === "income" },
] as const;

function groupByDay(rows: Movement[]) {
	const groups: { date: string; rows: Movement[] }[] = [];
	for (const row of rows) {
		const last = groups.at(-1);
		if (last?.date === row.date) last.rows.push(row);
		else groups.push({ date: row.date, rows: [row] });
	}
	return groups;
}

export function MovementsPage() {
	const today = useLimaDate();
	// Remount when the Lima day flips so ensureOpen runs again for the new cycle.
	return <Movements key={today} today={today} />;
}

function Movements({ today }: { today: string }) {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const [filterId, setFilterId] = useState<(typeof FILTERS)[number]["id"]>("all");
	const filter = FILTERS.find((item) => item.id === filterId) ?? FILTERS[0];
	const ensureOpen = useEnsureOpenCycle(space, today);

	const list = useQuery(
		convexQuery(api.transactions.list, ensureOpen.isSuccess ? { space, today } : "skip"),
	);
	const home = useQuery(
		convexQuery(api.balances.getHome, ensureOpen.isSuccess ? { space, today } : "skip"),
	);

	if (ensureOpen.isError || list.isError || home.isError) {
		return (
			<p role="alert" className="pt-6 text-sm text-warning-foreground">
				No pudimos cargar tus movimientos. Recarga la página.
			</p>
		);
	}

	if (!list.data || !home.data) {
		return (
			<div role="status" className="space-y-6 pt-6" aria-busy="true" aria-label="Cargando">
				<Skeleton className="h-10 w-56" />
				<Skeleton className="h-3 w-64" />
				<div className="mt-6 flex gap-2">
					<Skeleton className="h-8 w-20 rounded-full" />
					<Skeleton className="h-8 w-24 rounded-full" />
					<Skeleton className="h-8 w-20 rounded-full" />
				</div>
				<div className="mt-8 space-y-4">
					<Skeleton className="h-14" />
					<Skeleton className="h-14" />
					<Skeleton className="h-14" />
				</div>
			</div>
		);
	}

	const rows = list.data.rows.filter(filter.match);
	const count = list.data.rows.length;
	const countLabel =
		count === 500
			? "500+ movimientos en este ciclo"
			: `${count} ${count === 1 ? "movimiento" : "movimientos"} en este ciclo`;

	return (
		<>
			<header>
				<h1 className="font-heading text-4xl font-medium tracking-tight">Movimientos</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Ciclo {formatRange(list.data.startDate, list.data.endDate)} · del más reciente al más
					antiguo
				</p>
			</header>

			<div role="tablist" aria-label="Filtro" className="mt-6 flex flex-wrap gap-2">
				{FILTERS.map((item) => (
					<button
						key={item.id}
						type="button"
						role="tab"
						aria-selected={filterId === item.id}
						onClick={() => setFilterId(item.id)}
						className={cn(
							"min-h-11 rounded-full border px-3.5 py-1.5 text-sm",
							filterId === item.id
								? "border-foreground bg-foreground font-semibold text-background"
								: "border-border bg-background font-medium text-foreground",
						)}
					>
						{item.label}
					</button>
				))}
			</div>

			{rows.length === 0 ? (
				<p className="mt-10 text-sm text-muted-foreground">Nada en {filter.label} este ciclo.</p>
			) : (
				<div className="mt-8 space-y-8">
					{groupByDay(rows).map((group) => (
						<section key={group.date}>
							<h2 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
								{formatDayHeading(group.date, today)}
							</h2>
							<ul className="mt-1">
								{group.rows.map((row) => (
									<MovementRow key={row.id} row={row} />
								))}
							</ul>
						</section>
					))}
				</div>
			)}

			<p className="mt-12 border-t pt-5 text-sm text-muted-foreground">
				{countLabel} · Disponible hoy S/ {formatCents(home.data.dailyCents)}
			</p>
		</>
	);
}
