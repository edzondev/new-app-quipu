import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { addDays, formatDay } from "@quipu/backend/shared/dates";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { useLimaDate } from "#/hooks/use-lima-date";

type Home = FunctionReturnType<typeof api.balances.getHome>;
type Space = "personal" | "household";

export function HomePage() {
	const today = useLimaDate();
	const { space = "personal" } = useSearch({ from: "/_app" });
	const ensureOpen = useMutation({ mutationFn: useConvexMutation(api.cycles.ensureOpen) });
	const { mutate } = ensureOpen;

	// Close a cycle that ended while the app was closed before reading the number.
	useEffect(() => {
		mutate({ space });
	}, [mutate, space, today]);

	const home = useQuery(
		convexQuery(api.balances.getHome, ensureOpen.isSuccess ? { space, today } : "skip"),
	);

	if (ensureOpen.isError) {
		return (
			<p role="alert" className="pt-6 text-sm text-warning-foreground">
				No pudimos abrir tu ciclo. Recarga la página.
			</p>
		);
	}
	if (!home.data) return <HomeSkeleton />;
	return home.data.empty ? (
		<EmptyCycle space={space} planIncomeCents={home.data.planIncomeCents} />
	) : (
		<Overview home={home.data} space={space} today={today} />
	);
}

function HomeSkeleton() {
	return (
		<div className="animate-pulse space-y-6 pt-6" aria-busy="true" aria-label="Cargando">
			<div className="h-3 w-28 rounded bg-muted" />
			<div className="h-20 w-56 rounded bg-muted" />
			<div className="h-3 w-64 rounded bg-muted" />
			<div className="mt-10 space-y-4">
				<div className="h-14 rounded bg-muted" />
				<div className="h-14 rounded bg-muted" />
				<div className="h-14 rounded bg-muted" />
			</div>
		</div>
	);
}

function dueLabel(dueDate: string, today: string) {
	if (dueDate === today) return "Vence hoy";
	if (dueDate === addDays(today, 1)) return "Vence mañana";
	return `Vence ${formatDay(dueDate)}`;
}

function Overview({ home, space, today }: { home: Home; space: Space; today: string }) {
	const envelopes = [
		{ label: "Necesidades", cents: home.needsCents, dot: "bg-teal-700", spendable: true },
		{ label: "Gustos", cents: home.wantsCents, dot: "bg-amber-700", spendable: true },
		{ label: "Ahorro", cents: home.savingsCents, dot: "bg-stone-500", spendable: false },
	];
	const [whole, decimals] = formatCents(home.dailyCents).split(".");

	return (
		<>
			<section className="mt-6">
				<p className="text-[13px] font-semibold text-muted-foreground">
					{space === "household" ? "Pueden gastar hoy juntos" : "Puedes gastar hoy"}
				</p>
				<div className="mt-2 flex items-start justify-between gap-4">
					<p className="font-mono text-[72px] leading-none tracking-tight tabular-nums sm:text-[80px]">
						<span className="align-super text-[0.38em] text-muted-foreground">S/</span>
						{whole}
						<span className="text-[0.45em] text-muted-foreground">.{decimals}</span>
					</p>
					<Formula home={home} />
				</div>
				<p className="mt-3 text-[13px] text-muted-foreground">
					Sin comprometer tu ciclo. Quedan {home.daysLeft} {home.daysLeft === 1 ? "día" : "días"}.
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

			<section className="mt-10">
				<h2 className="text-[13px] font-semibold">Sobres</h2>
				<ul className="mt-2">
					{envelopes.map((envelope) => (
						<li
							key={envelope.label}
							className="flex items-center justify-between gap-3 border-b border-border/80 py-3.5 last:border-0"
						>
							<span className="flex items-center gap-2.5">
								<span aria-hidden className={`size-2.5 rounded-full ${envelope.dot}`} />
								<span className="text-[15px] font-semibold">{envelope.label}</span>
								{envelope.spendable && envelope.cents === 0 ? (
									<span className="text-xs font-semibold text-warning-foreground">Agotado</span>
								) : null}
							</span>
							<span className="font-mono text-[15px] font-semibold tabular-nums">
								S/ {formatCents(envelope.cents)}
							</span>
						</li>
					))}
				</ul>
			</section>

			{home.dueSoon.length > 0 ? (
				<section className="mt-10">
					<h2 className="text-[13px] font-semibold">Por pagar</h2>
					<ul className="mt-2">
						{home.dueSoon.map((item) => (
							<li
								key={item.id}
								className="flex items-center justify-between gap-4 border-b border-border/80 py-3.5 last:border-0"
							>
								<div className="min-w-0">
									<p className="truncate text-[15px] font-semibold">{item.name}</p>
									<p className="text-xs text-muted-foreground">{dueLabel(item.dueDate, today)}</p>
								</div>
								<span className="shrink-0 font-mono text-[15px] font-semibold tabular-nums">
									S/ {formatCents(item.amountCents)}
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</>
	);
}

function Formula({ home }: { home: Home }) {
	return (
		<Dialog>
			<DialogTrigger
				aria-label="Cómo se calcula"
				className="mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
			>
				i
			</DialogTrigger>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>Cómo se calcula</DialogTitle>
					<DialogDescription>Ya descontamos tus compromisos y tu ahorro.</DialogDescription>
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

function EmptyCycle({ space, planIncomeCents }: { space: Space; planIncomeCents: number }) {
	const addIncome = useMutation({ mutationFn: useConvexMutation(api.transactions.addIncome) });
	const [otherOpen, setOtherOpen] = useState(false);
	const [failed, setFailed] = useState(false);

	async function save(amountCents: number) {
		setFailed(false);
		try {
			await addIncome.mutateAsync({ space, amountCents });
		} catch {
			setFailed(true);
		}
	}

	return (
		<section className="mt-10 pb-16 sm:mt-14">
			<h1 className="max-w-2xl font-heading text-3xl font-medium tracking-tight sm:text-5xl">
				Aún no registras dinero en este ciclo.
			</h1>
			<p className="mt-5 max-w-lg text-sm text-muted-foreground">
				Registra un ingreso y Quipu reparte tu dinero en tus sobres.
			</p>
			<div className="mt-8 flex flex-col items-start gap-3">
				{planIncomeCents > 0 ? (
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
							loading={addIncome.isPending}
							onClick={() => save(planIncomeCents)}
						>
							Sí, ya me pagaron
						</Button>
						<button
							type="button"
							className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
							onClick={() => setOtherOpen(true)}
						>
							Registrar otro monto
						</button>
					</>
				) : (
					<Button size="lg" className="rounded-full px-7" onClick={() => setOtherOpen(true)}>
						Registrar ingreso
					</Button>
				)}
				{failed ? (
					<p role="alert" className="text-xs text-warning-foreground">
						No pudimos guardar el ingreso. Inténtalo otra vez.
					</p>
				) : null}
			</div>
			<IncomeDialog
				open={otherOpen}
				onOpenChange={setOtherOpen}
				pending={addIncome.isPending}
				onSave={save}
			/>
		</section>
	);
}

function IncomeDialog({
	open,
	onOpenChange,
	pending,
	onSave,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pending: boolean;
	onSave: (amountCents: number) => void;
}) {
	const [raw, setRaw] = useState("");
	const amountCents = toCents(raw);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>Registrar ingreso</DialogTitle>
					<DialogDescription>Para este ciclo. Se reparte en tus sobres.</DialogDescription>
				</DialogHeader>
				<DialogPanel>
					<div className="flex items-baseline gap-3 border-b border-neutral-400 pb-3 has-focus-visible:border-foreground">
						<span className="text-2xl text-muted-foreground">S/</span>
						<Input
							inputMode="decimal"
							autoComplete="off"
							aria-label="Monto del ingreso"
							placeholder="0.00"
							value={raw}
							onChange={(event) => setRaw(event.target.value)}
							unstyled
							className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:text-4xl [&_[data-slot=input]]:tabular-nums"
						/>
					</div>
				</DialogPanel>
				<DialogFooter>
					<Button
						loading={pending}
						disabled={pending || amountCents === 0}
						onClick={() => onSave(amountCents)}
					>
						Guardar ingreso
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
