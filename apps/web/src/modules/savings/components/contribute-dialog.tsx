import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { useForm, useSelector } from "@tanstack/react-form";
import { cn } from "cn";
import type { FunctionArgs } from "convex/server";
import * as z from "zod/mini";
import { Button } from "#/components/ui/button";
import { toastManager } from "#/components/ui/toast";
import {
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { positiveMoney } from "#/lib/money-schema";
import { CHIP } from "#/lib/typography";
import { AmountField } from "#/modules/commitments/components/amount-field";
import { DeleteButton } from "#/modules/register/delete-button";
import type { Movement } from "#/modules/register/movement-draft";
import { useFundActions } from "../use-fund-actions";
import type { Goal } from "./goal-card";

const QUICK_CENTS = 10_000;

/** Without `goal` the money goes to the emergency fund. */
type ContributeProps = {
	space: FunctionArgs<typeof api.transactions.addSaving>["space"];
	savingsCents: number;
	savedCents: number;
	targetCents: number | null;
	goal?: Pick<Goal, "id" | "name">;
	/** A saving to change or delete; its amount counts as available. */
	editing?: Movement;
	onClose: () => void;
};

export function ContributeForm({
	space,
	savingsCents,
	savedCents,
	targetCents,
	goal,
	editing,
	onClose,
}: ContributeProps) {
	const addSaving = useConvexMutation(api.transactions.addSaving);
	const updateSaving = useConvexMutation(api.transactions.updateSaving);
	const deleteSaving = useConvexMutation(api.transactions.deleteSaving);
	const {
		save,
		remove,
		pending,
		error: saveError,
	} = useFundActions({
		add: (value: Pick<FunctionArgs<typeof api.transactions.addSaving>, "amountCents" | "goalId">) =>
			addSaving({ space, ...value }),
		onAdded: () => toastManager.add({ title: "Guardado", type: "success" }),
		// An edit keeps the destination and the note of the row.
		update: (id, value) =>
			updateSaving({ space, id, amountCents: value.amountCents, note: editing?.note ?? undefined }),
		remove: (id) => deleteSaving({ space, id }),
		onDone: onClose,
		editing,
	});
	const available = Math.max(0, savingsCents + (editing?.amountCents ?? 0));
	const fits = (value: string) => toCents(value) <= available;
	// The same check gates the button and the submit (Enter included).
	const schema = z.object({
		amount: positiveMoney("Escribe un monto.").check(z.refine(fits)),
	});
	const form = useForm({
		defaultValues: { amount: editing ? (editing.amountCents / 100).toFixed(2) : "" },
		validators: { onSubmit: schema },
		onSubmit: ({ value }) =>
			save({ amountCents: toCents(value.amount), ...(goal ? { goalId: goal.id } : {}) }),
	});
	const amount = useSelector(form.store, (state) => state.values.amount);
	const over = !fits(amount);
	const shortcut = goal
		? { label: "Lo que falta", cents: Math.max(0, (targetCents ?? 0) - savedCents) }
		: { label: "Todo el Ahorro", cents: available };

	const canSave = schema.safeParse({ amount }).success && !pending;
	const error =
		over || available === 0 ? `Solo tienes S/ ${formatCents(available)} en Ahorro.` : undefined;

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
					<FormSheetTitle className="wrap-break-word">
						{goal ? `Aportar a ${goal.name}` : "Aportar al fondo"}
					</FormSheetTitle>
					<p className="text-sm text-muted-foreground tabular-nums">
						S/ {formatCents(savedCents)}
						{targetCents ? ` de S/ ${formatCents(targetCents)}` : ""}
					</p>
				</FormSheetHeader>
				<FormSheetPanel className="flex flex-col gap-4">
					<form.Field name="amount">
						{(field) => (
							<AmountField
								large
								label="Monto"
								value={field.state.value}
								onChange={field.handleChange}
								error={error ?? saveError}
							/>
						)}
					</form.Field>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className={CHIP}
							onClick={() => form.setFieldValue("amount", formatCents(QUICK_CENTS))}
						>
							S/ 100
						</button>
						{shortcut.cents > 0 ? (
							<button
								type="button"
								className={CHIP}
								onClick={() => form.setFieldValue("amount", formatCents(shortcut.cents))}
							>
								{shortcut.label} · S/ {formatCents(shortcut.cents)}
							</button>
						) : null}
					</div>
					<p className="flex items-start gap-2 text-sm text-muted-foreground">
						<span
							aria-hidden
							className={cn("mt-1.5 size-2 shrink-0 rounded-full", ENVELOPE_DOT.savings)}
						/>
						Sale del sobre Ahorro. No cuenta como gasto.
					</p>
				</FormSheetPanel>
				{editing ? (
					<FormSheetFooter>
						<DeleteButton
							prompt="¿Eliminar este ahorro? El monto vuelve a su sobre."
							disabled={pending}
							onDelete={remove}
						/>
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
							Aportar
						</Button>
					</FormSheetFooter>
				)}
			</form>
		</FormSheetPopup>
	);
}
