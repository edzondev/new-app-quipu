import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { useForm, useSelector } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import { useState } from "react";
import * as z from "zod/mini";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
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
import { positiveMoney } from "#/lib/money-schema";
import { readError } from "#/lib/read-error";
import { CHIP } from "#/lib/typography";
import { AmountField } from "#/modules/commitments/components/amount-field";

const fundGoalSchema = z.object({ amount: positiveMoney("Escribe un monto.") });

type FundGoalProps = {
	space: FunctionArgs<typeof api.goals.setFundGoal>["space"];
	fundGoalCents: number | null;
	suggestedCents: number | null;
	onClose: () => void;
};

function FundGoalForm({ space, fundGoalCents, suggestedCents, onClose }: FundGoalProps) {
	const setGoal = useConvexMutation(api.goals.setFundGoal);
	const [confirmingRemove, setConfirmingRemove] = useState(false);

	const save = useMutation({
		mutationFn: (targetCents: number | null) => setGoal({ space, targetCents }),
		onSuccess: onClose,
	});
	const initial = fundGoalCents ?? suggestedCents;
	const form = useForm({
		defaultValues: { amount: initial ? formatCents(initial) : "" },
		onSubmit: ({ value }) => save.mutate(toCents(value.amount)),
	});
	const amount = useSelector(form.store, (state) => state.values.amount);

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
					<DialogTitle>Meta del fondo</DialogTitle>
					{suggestedCents ? (
						<DialogDescription>
							Sugerimos 3 meses de lo que gastas en Necesidades. Puedes poner otra cifra.
						</DialogDescription>
					) : null}
				</DialogHeader>
				<DialogPanel className="flex flex-col gap-4">
					<form.Field name="amount">
						{(field) => (
							<AmountField
								large
								label="Meta del fondo"
								value={field.state.value}
								onChange={field.handleChange}
								error={save.isError ? readError(save.error) : undefined}
							/>
						)}
					</form.Field>
					{suggestedCents ? (
						<div>
							<button
								type="button"
								className={CHIP}
								onClick={() => form.setFieldValue("amount", formatCents(suggestedCents))}
							>
								3 meses de Necesidades · S/ {formatCents(suggestedCents)}
							</button>
						</div>
					) : null}
					{fundGoalCents ? (
						<div>
							<Button
								type="button"
								variant="link"
								size="sm"
								className="px-0 text-muted-foreground"
								onClick={() => setConfirmingRemove(true)}
							>
								Quitar meta
							</Button>
						</div>
					) : null}
				</DialogPanel>
				<DialogFooter variant="bare">
					<Button
						type="submit"
						className="h-11 w-full rounded-full"
						disabled={!fundGoalSchema.safeParse({ amount }).success || save.isPending}
						loading={save.isPending && !confirmingRemove}
					>
						Guardar meta
					</Button>
				</DialogFooter>
			</form>

			<AlertDialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
				<AlertDialogPopup>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Quitar la meta?</AlertDialogTitle>
						<AlertDialogDescription>
							Tener un fondo de emergencia te protege. Tu plata se queda en el fondo.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{save.isError ? (
						<p role="alert" className="px-6 pb-4 text-xs text-warning-foreground">
							{readError(save.error)}
						</p>
					) : null}
					<AlertDialogFooter>
						<Button variant="outline" loading={save.isPending} onClick={() => save.mutate(null)}>
							Quitar
						</Button>
						<AlertDialogClose render={<Button />}>Mantener meta</AlertDialogClose>
					</AlertDialogFooter>
				</AlertDialogPopup>
			</AlertDialog>
		</DialogPopup>
	);
}

export function FundGoalDialog({ open, ...props }: FundGoalProps & { open: boolean }) {
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) props.onClose();
			}}
		>
			{open ? <FundGoalForm {...props} /> : null}
		</Dialog>
	);
}
