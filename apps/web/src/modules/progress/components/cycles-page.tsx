import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { emptyMessage, LOAD_ERROR } from "../progress-text";
import { CycleRow } from "./cycle-row";

export function RowsSkeleton() {
	return (
		<div role="status" aria-busy="true" aria-label="Cargando" className="mt-4 space-y-4">
			<Skeleton className="h-11" />
			<Skeleton className="h-11" />
			<Skeleton className="h-11" />
		</div>
	);
}

/** One page of closed cycles. "Ver ciclos anteriores" mounts the next page from the `next` cursor. */
export function CyclesPage({ before }: { before?: string }) {
	const [showNext, setShowNext] = useState(false);
	const page = useQuery(convexQuery(api.progress.list, { before }));

	if (page.isError) {
		return (
			<p role="alert" className="pt-4 text-sm text-warning-foreground">
				{LOAD_ERROR}
			</p>
		);
	}
	if (!page.data) return <RowsSkeleton />;

	const { cycles, hidden, next } = page.data;
	const isFirstPage = before === undefined;
	const firstWithDetail = isFirstPage ? cycles.findIndex((c) => c.detail.kind === "ok") : -1;

	return (
		<>
			{cycles.length > 0 ? (
				<ul className="mt-2">
					{cycles.map((cycle, index) => (
						<CycleRow key={cycle.id} cycle={cycle} defaultOpen={index === firstWithDetail} />
					))}
				</ul>
			) : next === null ? (
				<p className="pt-4 text-sm text-muted-foreground">{emptyMessage(isFirstPage, hidden)}</p>
			) : null}
			{next === null ? null : showNext ? (
				<CyclesPage before={next} />
			) : (
				<Button
					type="button"
					variant="outline"
					className="mt-4 min-h-11"
					onClick={() => setShowNext(true)}
				>
					Ver ciclos anteriores
				</Button>
			)}
		</>
	);
}
