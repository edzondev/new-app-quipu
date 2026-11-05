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
import { useForm, useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { FunctionArgs } from "convex/server";
import { useState } from "react";
import * as z from "zod/mini";
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
import { positiveMoney } from "#/lib/money-schema";
import type { Draft, Kind } from "./movement-draft";
import { useMovementActions } from "./use-movement-actions";

type Extra = NonNullable<FunctionArgs<typeof api.transactions.addIncome>["extra"]>;
type Envelope = "needs" | "wants";
type IncomeType = "cycle" | "extra";
type Destination = "envelopes" | "savings";

type RegisterValues = {
	kind: Kind;
	amount: string;
	note: string;
	envelope: Envelope;
	incomeType: IncomeType;
	extraType: Extra["type"];
	destination: Destination;
};

const registerSchema = z.object({ amount: positiveMoney("Escribe un monto.") });

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
				<Button type="button" variant="ghost" disabled={disabled} onClick={onDelete}>
					Eliminar
				</Button>
				<Button type="button" variant="ghost" disabled={disabled} onClick={() => setConfirm(false)}>
					Cancelar
				</Button>
			</>
		);
	}

	return (
		<Button type="button" variant="ghost" disabled={disabled} onClick={() => setConfirm(true)}>
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

	const editId = draft.id;
	const defaultValues: RegisterValues = {
		kind: draft.kind,
		amount: draft.amount,
		note: draft.note ?? "",
		envelope: draft.envelope ?? "needs",
		incomeType: "cycle",
		extraType: "other",
		destination: "envelopes",
	};
	const form = useForm({
		defaultValues,
		onSubmit: ({ value }) => {
			const amountCents = toCents(value.amount);
			const note = value.note.trim() || undefined;
			save(
				value.kind === "expense"
					? { kind: value.kind, id: editId, amountCents, envelope: value.envelope, note }
					: {
							kind: value.kind,
							id: editId,
							amountCents,
							note,
							extra:
								value.incomeType === "extra"
									? { type: value.extraType, toSavings: value.destination === "savings" }
									: undefined,
						},
			);
		},
	});
	const { kind, amount, envelope, incomeType, destination } = useSelector(
		form.store,
		(state) => state.values,
	);

	const amountCents = toCents(amount);
	const valid = registerSchema.safeParse({ amount }).success;
	const originalCents = editId ? toCents(draft.amount) : 0;
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
			<form
				noValidate
				className="contents"
				onSubmit={(event) => {
					event.preventDefault();
					void form.handleSubmit();
				}}
			>
				<DialogHeader>
					<DialogTitle>Registrar</DialogTitle>
					<DialogDescription>
						En {space === "household" ? "Nuestro espacio" : "Personal"}
					</DialogDescription>
				</DialogHeader>
				<DialogPanel className="flex flex-col gap-5">
					{editId ? null : (
						<form.Field name="kind">
							{(field) => (
								<ChoiceChips
									label="Tipo"
									options={KINDS}
									value={field.state.value}
									onChange={field.handleChange}
								/>
							)}
						</form.Field>
					)}

					<div className="flex items-baseline gap-3 border-b border-input pb-3 has-focus-visible:border-foreground">
						<span className="text-2xl text-muted-foreground">S/</span>
						<form.Field name="amount">
							{(field) => (
								<Input
									inputMode="decimal"
									autoComplete="off"
									aria-label="Monto"
									placeholder="0.00"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
									unstyled
									className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:text-4xl [&_[data-slot=input]]:tabular-nums"
								/>
							)}
						</form.Field>
					</div>

					{isExpense ? (
						<>
							<div className="flex flex-col gap-2">
								<p aria-hidden className="text-sm text-muted-foreground">
									Sale de
								</p>
								<form.Field name="envelope">
									{(field) => (
										<ChoiceChips
											label="Sale de"
											options={envelopeOptions}
											value={field.state.value}
											onChange={field.handleChange}
										/>
									)}
								</form.Field>
								{home && amountCents > room ? (
									<p role="status" className="text-xs text-warning-foreground">
										Supera lo que queda en {ENVELOPE_LABELS[envelope]} (S/{" "}
										{formatCents(Math.max(0, room))})
									</p>
								) : null}
							</div>
							{home && valid ? (
								<p className="text-sm text-muted-foreground">
									Disponible hoy: S/ {formatCents(home.dailyCents)} → S/ {formatCents(dailyAfter)}
								</p>
							) : null}
						</>
					) : null}

					{!isExpense && !editId ? (
						<>
							<form.Field name="incomeType">
								{(field) => (
									<ChoiceChips
										label="Tipo de ingreso"
										options={INCOME_TYPES}
										value={field.state.value}
										onChange={field.handleChange}
									/>
								)}
							</form.Field>
							{incomeType === "extra" ? (
								<>
									<form.Field name="extraType">
										{(field) => (
											<ChoiceChips
												label="Tipo de extra"
												options={EXTRA_TYPES}
												value={field.state.value}
												onChange={field.handleChange}
											/>
										)}
									</form.Field>
									<form.Field name="destination">
										{(field) => (
											<ChoiceChips
												label="Destino del extra"
												options={DESTINATIONS}
												value={field.state.value}
												onChange={field.handleChange}
											/>
										)}
									</form.Field>
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
							<form.Field name="note">
								{(field) => (
									<Label className="mt-2 flex flex-col items-stretch gap-1.5 text-sm sm:text-sm font-normal">
										<span className="text-muted-foreground">Concepto · opcional</span>
										<Input
											placeholder={isExpense ? "Ej. almuerzo" : "Ej. pago de cliente"}
											maxLength={NOTE_MAX_LENGTH}
											value={field.state.value}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									</Label>
								)}
							</form.Field>
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
					<Button type="submit" loading={pending} disabled={!valid || pending}>
						{editId ? "Guardar" : isExpense ? "Guardar gasto" : "Guardar ingreso"}
					</Button>
				</DialogFooter>
			</form>
		</DialogPopup>
	);
}
