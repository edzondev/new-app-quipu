import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, NOTE_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { cn } from "cn";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import type { Draft, Kind } from "./movement-draft";
import { useMovementActions } from "./use-movement-actions";

type GoalId = FunctionReturnType<typeof api.goals.list>[number]["id"];
type Envelope = "needs" | "wants";
type DeletableKind = Exclude<Kind, "saving">;

const KINDS: { value: Kind; label: string }[] = [
	{ value: "expense", label: "Gasto" },
	{ value: "income", label: "Ingreso" },
	{ value: "saving", label: "Aporte a una meta" },
];

const ENVELOPES: { value: Envelope; label: string }[] = [
	{ value: "needs", label: ENVELOPE_LABELS.needs },
	{ value: "wants", label: ENVELOPE_LABELS.wants },
];

function ChoiceChips<T extends string>({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<fieldset className="flex min-w-0 flex-wrap gap-2 border-0 p-0">
			<legend className="sr-only">{label}</legend>
			{options.map((option) => (
				<label
					key={option.value}
					className={cn(
						"inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm font-semibold has-focus-visible:ring-2 has-focus-visible:ring-ring",
						value === option.value
							? "bg-foreground text-background"
							: "bg-muted text-muted-foreground",
					)}
				>
					<input
						type="radio"
						name={label}
						value={option.value}
						checked={value === option.value}
						onChange={() => onChange(option.value)}
						className="sr-only"
					/>
					{option.label}
				</label>
			))}
		</fieldset>
	);
}

function DeleteButton({
	kind,
	disabled,
	onDelete,
}: {
	kind: DeletableKind;
	disabled: boolean;
	onDelete: () => void;
}) {
	const [confirm, setConfirm] = useState(false);
	const prompt =
		kind === "expense"
			? "¿Eliminar este gasto? El monto vuelve a su sobre."
			: "¿Eliminar este ingreso?";

	if (confirm) {
		return (
			<>
				<p className="mr-auto text-sm text-muted-foreground">{prompt}</p>
				<Button variant="ghost" disabled={disabled} onClick={onDelete}>
					Eliminar
				</Button>
				<Button variant="ghost" disabled={disabled} onClick={() => setConfirm(false)}>
					Cancelar
				</Button>
			</>
		);
	}

	return (
		<Button variant="ghost" disabled={disabled} onClick={() => setConfirm(true)}>
			Eliminar
		</Button>
	);
}

export function RegisterForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const goals = useQuery(convexQuery(api.goals.list, { space })).data ?? [];
	const { save, remove, pending, error } = useMovementActions(space, onDone);

	const [kind, setKind] = useState(draft.kind);
	const [amount, setAmount] = useState(draft.amount);
	const [note, setNote] = useState(draft.note ?? "");
	const [envelope, setEnvelope] = useState(draft.envelope ?? "needs");
	const [pickedGoal, setPickedGoal] = useState<GoalId>();

	const kinds = goals.length > 0 ? KINDS : KINDS.filter((item) => item.value !== "saving");
	const selected = kinds.some((item) => item.value === kind) ? kind : "expense";
	const goalId = goals.find((goal) => goal.id === pickedGoal)?.id ?? goals[0]?.id;
	const amountCents = toCents(amount);
	const editId = draft.id;
	const editKind = draft.kind === "saving" ? null : draft.kind;
	const noteValue = note.trim() || undefined;
	const canSave = amountCents > 0 && !pending && (selected !== "saving" || goalId !== undefined);

	return (
		<DialogPopup>
			<DialogHeader>
				<DialogTitle>Registrar</DialogTitle>
				<DialogDescription>Queda en el ciclo de hoy.</DialogDescription>
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-5">
				{editId ? null : (
					<ChoiceChips label="Tipo" options={kinds} value={selected} onChange={setKind} />
				)}

				<div className="flex items-baseline gap-3 border-b border-input pb-3 has-focus-visible:border-foreground">
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
					<ChoiceChips label="Sobre" options={ENVELOPES} value={envelope} onChange={setEnvelope} />
				) : null}

				{selected === "saving" ? (
					<label className="flex flex-col gap-1.5 text-sm">
						<span className="text-muted-foreground">Meta</span>
						<select
							value={goalId}
							onChange={(event) =>
								setPickedGoal(goals.find((goal) => goal.id === event.target.value)?.id)
							}
							className="h-9 rounded-lg border border-input bg-background px-3"
						>
							{goals.map((goal) => (
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
				{editId && editKind ? (
					<DeleteButton
						kind={editKind}
						disabled={pending}
						onDelete={() => remove(editKind, editId)}
					/>
				) : null}
				<Button
					loading={pending}
					disabled={!canSave}
					onClick={() => {
						if (selected === "saving") {
							if (!goalId) return;
							save({ kind: "saving", amountCents, note: noteValue, goalId });
							return;
						}
						if (selected === "expense") {
							save({
								kind: "expense",
								id: draft.id,
								amountCents,
								envelope,
								note: noteValue,
							});
							return;
						}
						save({ kind: "income", id: draft.id, amountCents, note: noteValue });
					}}
				>
					Guardar
				</Button>
			</DialogFooter>
		</DialogPopup>
	);
}
