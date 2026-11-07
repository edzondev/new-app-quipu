import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import { groupCommitments } from "../commitment-view";
import { AddCommitmentDialog } from "./add-commitment-dialog";
import { CommitmentRow, PaymentRow } from "./commitment-row";

export function CommitmentsPage() {
	const today = useLimaDate();
	// Remount when the Lima day flips so ensureOpen runs again for the new cycle.
	return <Commitments key={today} today={today} />;
}

function Group({
	title,
	totalCents,
	empty,
	children,
}: {
	title: string;
	totalCents?: number;
	empty?: string;
	children: React.ReactNode[];
}) {
	if (children.length === 0 && !empty) return null;
	return (
		<section>
			<h2 className="flex items-baseline justify-between text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
				{title}
				{totalCents === undefined ? null : (
					<span className="tabular-nums">S/ {formatCents(totalCents)}</span>
				)}
			</h2>
			{children.length === 0 ? (
				<p className="mt-3 text-sm text-muted-foreground">{empty}</p>
			) : (
				<ul className="mt-1">{children}</ul>
			)}
		</section>
	);
}

function Commitments({ today }: { today: string }) {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const queryClient = useQueryClient();
	const [addingIn, setAddingIn] = useState<typeof space | null>(null);
	const ensureOpen = useEnsureOpenCycle(space, today);
	const list = useQuery(
		convexQuery(api.commitments.list, ensureOpen.isSuccess ? { space, today } : "skip"),
	);

	if (ensureOpen.isError || list.isError) {
		return (
			<div role="alert" className="pt-6">
				<p className="text-sm text-warning-foreground">No pudimos cargar tus compromisos.</p>
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

	if (!list.data) {
		return (
			<div role="status" className="space-y-6 pt-6" aria-busy="true" aria-label="Cargando">
				<Skeleton className="h-10 w-56" />
				<Skeleton className="h-3 w-64" />
				<div className="mt-8 space-y-4">
					<Skeleton className="h-14" />
					<Skeleton className="h-14" />
					<Skeleton className="h-14" />
				</div>
			</div>
		);
	}

	const { items, payments, payableCents, paidCents } = list.data;
	const groups = groupCommitments(items);

	return (
		<>
			<header className="flex flex-wrap items-end gap-4">
				<div className="min-w-0 flex-1 basis-64">
					<h1 className="font-heading text-4xl font-medium tracking-tight">Compromisos</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Lo que pagas cada mes. Quipu lo reserva antes de que gastes.
					</p>
				</div>
				<Button variant="outline" className="shrink-0" onClick={() => setAddingIn(space)}>
					+ Añadir compromiso
				</Button>
			</header>

			{items.length === 0 && payments.length === 0 ? (
				<p className="mt-10 text-sm text-muted-foreground">
					Sin compromisos. Añade tus pagos fijos y Quipu los reserva por ti.
				</p>
			) : (
				<div className="mt-8 space-y-8">
					<p className="text-sm text-muted-foreground tabular-nums">
						S/ {formatCents(payableCents)} por pagar · S/ {formatCents(paidCents)} pagado este ciclo
					</p>
					<Group title="Por pagar este ciclo" totalCents={payableCents}>
						{groups.pending.map((item) => (
							<CommitmentRow key={item.id} item={item} today={today} space={space} />
						))}
					</Group>
					<Group title="Más adelante">
						{groups.later.map((item) => (
							<CommitmentRow key={item.id} item={item} today={today} space={space} />
						))}
					</Group>
					<Group
						title="Ya pagados este ciclo"
						totalCents={paidCents}
						empty="Aún no pagas nada este ciclo."
					>
						{payments.map((payment) => (
							<PaymentRow key={payment.paymentId} payment={payment} today={today} />
						))}
					</Group>
					<Group title="Pagados antes">
						{groups.paidBefore.map((item) => (
							<CommitmentRow key={item.id} item={item} today={today} space={space} />
						))}
					</Group>
				</div>
			)}

			<AddCommitmentDialog space={addingIn} onClose={() => setAddingIn(null)} />
		</>
	);
}
