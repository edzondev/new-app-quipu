import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import {
	AMOUNT_KEYS,
	ENVELOPE_LABELS,
	formatCents,
	getDailyCents,
	NOTE_MAX_LENGTH,
	toCents,
} from "@quipu/backend/shared/budget";
import { addDays, formatDay, isEarlyIncomeWindow } from "@quipu/backend/shared/dates";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { FunctionArgs } from "convex/server";
import { useState } from "react";
import { ChoiceChips } from "#/components/choice-chips";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import type { Draft, Kind } from "./movement-draft";
import { useMovementActions } from "./use-movement-actions";

type Extra = NonNullable<FunctionArgs<typeof api.transactions.addIncome>["extra"]>;
type Envelope = "needs" | "wants";
type IncomeType = "cycle" | "extra";
type Destination = "envelopes" | "savings";

const KINDS: { value: Kind; label: string }[] = [
	{ value: "expense", label: "Gasto" },
	{ value: "income", label: "Ingreso" },
];

const INCOME_TYPES: { value: IncomeType; label: string }[] = [
	{ value: "cycle", label: "Para este ciclo" },
	{ value: "extra", label: "Extra" },
];

const EXTRA_TYPES: { value: Extra["type"]; label: string }[] = [
	{ value: "gratification", label: "Gratificación" },
	{ value: "bonus", label: "Bono" },
	{ value: "repayment", label: "Deuda que te devolvieron" },
	{ value: "other", label: "Otro" },
];

const DESTINATIONS: { value: Destination; label: string }[] = [
	{ value: "envelopes", label: "Sumar a mis sobres" },
	{ value: "savings", label: "Directo a Ahorro" },
];

const ENVELOPES: Envelope[] = ["needs", "wants"];

function DeleteButton({
	kind,
	disabled,
	onDelete,
}: {
	kind: Kind;
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
	const today = useLimaDate();
	const ensureOpen = useEnsureOpenCycle(space, today);
	const homeArgs: { space: "personal" | "household"; today: string } | "skip" = ensureOpen.isSuccess
		? { space, today }
		: "skip";
	const home = useQuery(convexQuery(api.balances.getHome, homeArgs)).data;
	const { save, remove, pending, error } = useMovementActions(space, onDone);

	const [kind, setKind] = useState(draft.kind);
	const [amount, setAmount] = useState(draft.amount);
	const [note, setNote] = useState(draft.note ?? "");
	const [envelope, setEnvelope] = useState<Envelope>(draft.envelope ?? "needs");
	const [incomeType, setIncomeType] = useState<IncomeType>("cycle");
	const [extraType, setExtraType] = useState<Extra["type"]>("other");
	const [destination, setDestination] = useState<Destination>("envelopes");

	const editId = draft.id;
	const amountCents = toCents(amount);
	const originalCents = editId ? toCents(draft.amount) : 0;
	const noteValue = note.trim() || undefined;
	const isExpense = kind === "expense";

	const envelopeOptions = ENVELOPES.map((value) => ({
		value,
		label: home
			? `${ENVELOPE_LABELS[value]} · S/ ${formatCents(home[AMOUNT_KEYS[value]])}`
			: ENVELOPE_LABELS[value],
	}));
	// Editing an expense gives its own amount back to the envelope it came from.
	const room = home
		? home[AMOUNT_KEYS[envelope]] + (envelope === draft.envelope ? originalCents : 0)
		: 0;
	const dailyAfter = home
		? getDailyCents(
				home.needsCents + home.wantsCents - home.pendingCents - (amountCents - originalCents),
				home.daysLeft,
			)
		: 0;
	const incomeNote =
		incomeType === "extra"
			? destination === "savings"
				? "Tu número de hoy no cambia."
				: null
			: home && isEarlyIncomeWindow(today, home.endDate)
				? `Para el ciclo que empieza el ${formatDay(addDays(home.endDate, 1))}. Tu número de hoy no cambia.`
				: null;

	return (
		<DialogPopup>
			<DialogHeader>
				<DialogTitle>Registrar</DialogTitle>
				<DialogDescription>
					En {space === "household" ? "Nuestro espacio" : "Personal"}
				</DialogDescription>
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-5">
				{editId ? null : (
					<ChoiceChips label="Tipo" options={KINDS} value={kind} onChange={setKind} />
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

				{isExpense ? (
					<>
						<div className="flex flex-col gap-2">
							<p aria-hidden className="text-sm text-muted-foreground">
								Sale de
							</p>
							<ChoiceChips
								label="Sale de"
								options={envelopeOptions}
								value={envelope}
								onChange={setEnvelope}
							/>
							{home && amountCents > room ? (
								<p role="status" className="text-xs text-warning-foreground">
									Supera lo que queda en {ENVELOPE_LABELS[envelope]} (S/{" "}
									{formatCents(Math.max(0, room))})
								</p>
							) : null}
						</div>
						{home && amountCents > 0 ? (
							<p className="text-sm text-muted-foreground">
								Disponible hoy: S/ {formatCents(home.dailyCents)} → S/ {formatCents(dailyAfter)}
							</p>
						) : null}
					</>
				) : null}

				{!isExpense && !editId ? (
					<>
						<ChoiceChips
							label="Tipo de ingreso"
							options={INCOME_TYPES}
							value={incomeType}
							onChange={setIncomeType}
						/>
						{incomeType === "extra" ? (
							<>
								<ChoiceChips
									label="Tipo de extra"
									options={EXTRA_TYPES}
									value={extraType}
									onChange={setExtraType}
								/>
								<ChoiceChips
									label="Destino del extra"
									options={DESTINATIONS}
									value={destination}
									onChange={setDestination}
								/>
							</>
						) : null}
						{incomeNote ? <p className="text-sm text-muted-foreground">{incomeNote}</p> : null}
					</>
				) : null}

				<Collapsible defaultOpen={Boolean(draft.note)}>
					<CollapsibleTrigger className="min-h-11 text-sm font-semibold text-muted-foreground">
						Más detalles
					</CollapsibleTrigger>
					<CollapsiblePanel>
						<Label className="mt-2 flex flex-col gap-1.5 text-sm">
							<span className="text-muted-foreground">Concepto · opcional</span>
							<Input
								placeholder={isExpense ? "Ej. almuerzo" : "Ej. pago de cliente"}
								maxLength={NOTE_MAX_LENGTH}
								value={note}
								onChange={(event) => setNote(event.target.value)}
							/>
						</Label>
					</CollapsiblePanel>
				</Collapsible>

				{error ? (
					<p role="alert" className="text-xs text-warning-foreground">
						{error}
					</p>
				) : null}
			</DialogPanel>
			<DialogFooter>
				{editId ? (
					<DeleteButton
						kind={draft.kind}
						disabled={pending}
						onDelete={() => remove(draft.kind, editId)}
					/>
				) : null}
				<Button
					loading={pending}
					disabled={amountCents <= 0 || pending}
					onClick={() =>
						save(
							isExpense
								? { kind, id: editId, amountCents, envelope, note: noteValue }
								: {
										kind,
										id: editId,
										amountCents,
										note: noteValue,
										extra:
											incomeType === "extra"
												? {
														type: extraType,
														toSavings: destination === "savings",
													}
												: undefined,
									},
						)
					}
				>
					{editId ? "Guardar" : isExpense ? "Guardar gasto" : "Guardar ingreso"}
				</Button>
			</DialogFooter>
		</DialogPopup>
	);
}
