import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import { useState } from "react";
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
import { readError } from "#/lib/read-error";
import { CHIP } from "#/lib/typography";
import { AmountField } from "#/modules/commitments/components/amount-field";

type FundGoalProps = {
	space: FunctionArgs<typeof api.goals.setFundGoal>["space"];
	fundGoalCents: number | null;
	suggestedCents: number | null;
	onClose: () => void;
};

function FundGoalForm({ space, fundGoalCents, suggestedCents, onClose }: FundGoalProps) {
	const setGoal = useConvexMutation(api.goals.setFundGoal);
	const [amount, setAmount] = useState(() => {
		const initial = fundGoalCents ?? suggestedCents;
		return initial ? formatCents(initial) : "";
	});
	const [confirmingRemove, setConfirmingRemove] = useState(false);
	const amountCents = toCents(amount);

	const save = useMutation({
		mutationFn: (targetCents: number | null) => setGoal({ space, targetCents }),
		onSuccess: onClose,
	});

	return (
		<DialogPopup>
			<DialogHeader>
				<DialogTitle>Meta del fondo</DialogTitle>
				{suggestedCents ? (
					<DialogDescription>
						Sugerimos 3 meses de lo que gastas en Necesidades. Puedes poner otra cifra.
					</DialogDescription>
				) : null}
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-4">
				<AmountField
					large
					label="Meta del fondo"
					value={amount}
					onChange={setAmount}
					error={save.isError ? readError(save.error) : undefined}
				/>
				{suggestedCents ? (
					<div>
						<button
							type="button"
							className={CHIP}
							onClick={() => setAmount(formatCents(suggestedCents))}
						>
							3 meses de Necesidades · S/ {formatCents(suggestedCents)}
						</button>
					</div>
				) : null}
				{fundGoalCents ? (
					<div>
						<Button
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
					className="h-11 w-full rounded-full"
					disabled={amountCents <= 0 || save.isPending}
					loading={save.isPending && !confirmingRemove}
					onClick={() => save.mutate(amountCents)}
				>
					Guardar meta
				</Button>
			</DialogFooter>

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
