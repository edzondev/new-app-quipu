import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, NOTE_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { useForm, useSelector } from "@tanstack/react-form";
import { cn } from "cn";
import type { FunctionArgs } from "convex/server";
import * as z from "zod/mini";
import { ChoiceChips } from "#/components/choice-chips";
import { Button } from "#/components/ui/button";
import {
	FormSheetDescription,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";
import { Input } from "#/components/ui/input";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { positiveMoney } from "#/lib/money-schema";
import { EYEBROW } from "#/lib/typography";
import { AmountField } from "#/modules/commitments/components/amount-field";
import { DeleteButton } from "#/modules/register/delete-button";
import type { Movement } from "#/modules/register/movement-draft";
import { useFundActions } from "../use-fund-actions";

type Reason = FunctionArgs<typeof api.transactions.withdrawSaving>["reason"];

type WithdrawValues = { amount: string; reason: Reason; note: string };

const REASONS: { value: Reason; label: string }[] = [
	{ value: "emergency", label: "Emergencia" },
	{ value: "unexpected", label: "Algo imprevisto" },
	{ value: "mistake", label: "Me equivoqué al aportar" },
	{ value: "other", label: "Otro" },
];

type WithdrawProps = {
	space: FunctionArgs<typeof api.transactions.withdrawSaving>["space"];
	fundCents: number;
	/** A withdrawal to change or delete; its amount counts as available. */
	editing?: Movement;
	onClose: () => void;
};

export function WithdrawForm({ space, fundCents, editing, onClose }: WithdrawProps) {
	const withdraw = useConvexMutation(api.transactions.withdrawSaving);
	const updateWithdrawal = useConvexMutation(api.transactions.updateWithdrawal);
	const deleteWithdrawal = useConvexMutation(api.transactions.deleteWithdrawal);
	const { save, remove, pending, error } = useFundActions({
		add: (value: Omit<FunctionArgs<typeof api.transactions.withdrawSaving>, "space">) =>
			withdraw({ space, ...value }),
		update: (id, value) => updateWithdrawal({ space, id, ...value }),
		remove: (id) => deleteWithdrawal({ space, id }),
		onDone: onClose,
		editing,
	});
	const defaultValues: WithdrawValues = {
		amount: editing ? (editing.amountCents / 100).toFixed(2) : "",
		reason: editing?.reason ?? "emergency",
		note: editing?.note ?? "",
	};
	const available = fundCents + (editing?.amountCents ?? 0);
	const fits = (value: string) => toCents(value) <= available;
	// The same check gates the button and the submit (Enter included).
	const schema = z.object({
		amount: positiveMoney("Escribe un monto.").check(z.refine(fits)),
		reason: z.enum(["emergency", "unexpected", "mistake", "other"]),
		note: z.string().check(z.trim(), z.maxLength(NOTE_MAX_LENGTH)),
	});
	const form = useForm({
		defaultValues,
		validators: { onSubmit: schema },
		onSubmit: ({ value }) =>
			save({
				amountCents: toCents(value.amount),
				reason: value.reason,
				note: value.reason === "other" ? value.note.trim() || undefined : undefined,
			}),
	});
	const values = useSelector(form.store, (state) => state.values);
	const { amount, reason } = values;
	const over = !fits(amount);
	const canSave = schema.safeParse(values).success && !pending;

	return (
		<FormSheetPopup>
			<form
				noValidate
				className="contents"
				onSubmit={(event) => {
					event.preventDefault();
					void form.handleSubmit();
				}}
			>
				<FormSheetHeader>
					<FormSheetTitle>Retirar del fondo</FormSheetTitle>
					<FormSheetDescription>Tienes S/ {formatCents(available)}</FormSheetDescription>
				</FormSheetHeader>
				<FormSheetPanel className="flex flex-col gap-5">
					<form.Field name="amount">
						{(field) => (
							<AmountField
								large
								label="Monto a retirar"
								value={field.state.value}
								onChange={field.handleChange}
								error={over ? `Tu fondo tiene S/ ${formatCents(available)}.` : error}
							/>
						)}
					</form.Field>
					<div className="flex flex-col gap-2">
						<p aria-hidden className={EYEBROW}>
							Motivo
						</p>
						<form.Field name="reason">
							{(field) => (
								<ChoiceChips
									label="Motivo"
									options={REASONS}
									value={field.state.value}
									onChange={field.handleChange}
								/>
							)}
						</form.Field>
					</div>
					{reason === "other" ? (
						<form.Field name="note">
							{(field) => (
								<Input
									aria-label="¿Para qué?"
									placeholder="¿Para qué?"
									maxLength={NOTE_MAX_LENGTH}
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							)}
						</form.Field>
					) : null}
					<p className="flex items-start gap-2 text-sm text-muted-foreground">
						<span
							aria-hidden
							className={cn("mt-1.5 size-2 shrink-0 rounded-full", ENVELOPE_DOT.needs)}
						/>
						Pasa a Necesidades de este ciclo.
					</p>
				</FormSheetPanel>
				{editing ? (
					<FormSheetFooter>
						<DeleteButton prompt="¿Eliminar este retiro?" disabled={pending} onDelete={remove} />
						<Button type="submit" disabled={!canSave} loading={pending}>
							Guardar
						</Button>
					</FormSheetFooter>
				) : (
					<FormSheetFooter variant="bare">
						<Button
							type="submit"
							className="h-11 w-full rounded-full"
							disabled={!canSave}
							loading={pending}
						>
							Confirmar
						</Button>
					</FormSheetFooter>
				)}
			</form>
		</FormSheetPopup>
	);
}
