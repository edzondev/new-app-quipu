import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { NOTE_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { createContext, useContext, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";

type Kind = "expense" | "income" | "saving";
type GoalId = FunctionReturnType<typeof api.goals.list>[number]["id"];

type Draft = {
	kind: Kind;
	amount: string;
};

const KINDS: { kind: Kind; label: string }[] = [
	{ kind: "expense", label: "Gasto" },
	{ kind: "income", label: "Ingreso" },
	{ kind: "saving", label: "Aporte a una meta" },
];

const ENVELOPES = [
	{ value: "needs", label: "Necesidades" },
	{ value: "wants", label: "Gustos" },
] as const;

const RegisterContext = createContext<(draft?: Partial<Draft>) => void>(() => {});

export function useRegister() {
	return useContext(RegisterContext);
}

export function RegisterProvider({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [session, setSession] = useState(0);
	const [draft, setDraft] = useState<Draft>({ kind: "expense", amount: "" });

	function openRegister(next?: Partial<Draft>) {
		setDraft({ kind: "expense", amount: "", ...next });
		setSession((current) => current + 1);
		setOpen(true);
	}

	return (
		<RegisterContext.Provider value={openRegister}>
			{children}
			<Dialog open={open} onOpenChange={setOpen}>
				{open ? <RegisterForm key={session} draft={draft} onDone={() => setOpen(false)} /> : null}
			</Dialog>
		</RegisterContext.Provider>
	);
}

function readError(error: unknown) {
	if (error instanceof ConvexError && typeof error.data === "string") return error.data;
	return "No pudimos guardarlo. Inténtalo otra vez.";
}

function RegisterForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const goals = useQuery(convexQuery(api.goals.list, { space }));
	const addExpense = useMutation({ mutationFn: useConvexMutation(api.transactions.addExpense) });
	const addIncome = useMutation({ mutationFn: useConvexMutation(api.transactions.addIncome) });
	const addSaving = useMutation({ mutationFn: useConvexMutation(api.transactions.addSaving) });

	const [kind, setKind] = useState<Kind>(draft.kind);
	const [amount, setAmount] = useState(draft.amount);
	const [note, setNote] = useState("");
	const [envelope, setEnvelope] = useState<(typeof ENVELOPES)[number]["value"]>("needs");
	const [goalId, setGoalId] = useState<GoalId | undefined>(goals.data?.[0]?.id);
	const [error, setError] = useState<string | null>(null);

	const goalOptions = goals.data ?? [];
	const visibleKinds =
		goalOptions.length > 0 ? KINDS : KINDS.filter((item) => item.kind !== "saving");
	const selected = visibleKinds.some((item) => item.kind === kind) ? kind : "expense";
	const selectedGoal = goalOptions.find((goal) => goal.id === goalId)?.id ?? goalOptions[0]?.id;
	const pending = addExpense.isPending || addIncome.isPending || addSaving.isPending;
	const amountCents = toCents(amount);

	async function save() {
		setError(null);
		if (amountCents === 0) {
			setError("Escribe el monto.");
			return;
		}
		const trimmed = note.trim() || undefined;
		try {
			if (selected === "expense") {
				await addExpense.mutateAsync({ space, amountCents, envelope, note: trimmed });
			} else if (selected === "income") {
				await addIncome.mutateAsync({ space, amountCents, note: trimmed });
			} else if (selectedGoal) {
				await addSaving.mutateAsync({ space, amountCents, goalId: selectedGoal, note: trimmed });
			}
			onDone();
		} catch (caught) {
			setError(readError(caught));
		}
	}

	return (
		<DialogPopup>
			<DialogHeader>
				<DialogTitle>Registrar</DialogTitle>
				<DialogDescription>Queda en el ciclo de hoy.</DialogDescription>
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-5">
				<div role="radiogroup" aria-label="Tipo" className="flex flex-wrap gap-2">
					{visibleKinds.map((item) => (
						<button
							key={item.kind}
							type="button"
							role="radio"
							aria-checked={selected === item.kind}
							onClick={() => setKind(item.kind)}
							className={
								selected === item.kind
									? "rounded-full bg-foreground px-3 py-1.5 text-sm font-semibold text-background"
									: "rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-muted-foreground"
							}
						>
							{item.label}
						</button>
					))}
				</div>

				<div className="flex items-baseline gap-3 border-b border-neutral-400 pb-3 has-focus-visible:border-foreground">
					<span className="text-2xl text-muted-foreground">S/</span>
					<Input
						inputMode="decimal"
						autoComplete="off"
						aria-label="Monto"
						placeholder="0.00"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						unstyled
						className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:text-4xl [&_[data-slot=input]]:tabular-nums"
					/>
				</div>

				{selected === "expense" ? (
					<div role="radiogroup" aria-label="Sobre" className="flex gap-2">
						{ENVELOPES.map((item) => (
							<button
								key={item.value}
								type="button"
								role="radio"
								aria-checked={envelope === item.value}
								onClick={() => setEnvelope(item.value)}
								className={
									envelope === item.value
										? "rounded-full bg-foreground px-3 py-1.5 text-sm font-semibold text-background"
										: "rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-muted-foreground"
								}
							>
								{item.label}
							</button>
						))}
					</div>
				) : null}

				{selected === "saving" ? (
					<label className="flex flex-col gap-1.5 text-sm">
						<span className="text-muted-foreground">Meta</span>
						<select
							value={selectedGoal}
							onChange={(event) =>
								setGoalId(goalOptions.find((goal) => goal.id === event.target.value)?.id)
							}
							className="h-9 rounded-lg border border-input bg-background px-3"
						>
							{goalOptions.map((goal) => (
								<option key={goal.id} value={goal.id}>
									{goal.name}
								</option>
							))}
						</select>
					</label>
				) : null}

				<Input
					aria-label="Nota"
					placeholder="Nota (opcional)"
					maxLength={NOTE_MAX_LENGTH}
					value={note}
					onChange={(event) => setNote(event.target.value)}
				/>

				{error ? (
					<p role="alert" className="text-xs text-warning-foreground">
						{error}
					</p>
				) : null}
			</DialogPanel>
			<DialogFooter>
				<Button
					loading={pending}
					disabled={pending || amountCents === 0}
					onClick={() => void save()}
				>
					Guardar
				</Button>
			</DialogFooter>
		</DialogPopup>
	);
}
