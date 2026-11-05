import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/ui/dialog";
import { readError } from "#/lib/read-error";
import { AmountField } from "#/modules/commitments/components/amount-field";

const QUICK_CENTS = 10_000;

type ContributeProps = {
	space: "personal" | "household";
	savingsCents: number;
	fundCents: number;
	fundGoalCents: number | null;
	onClose: () => void;
};

function ContributeForm({
	space,
	savingsCents,
	fundCents,
	fundGoalCents,
	onClose,
}: ContributeProps) {
	const add = useConvexMutation(api.transactions.addSaving);
	const [amount, setAmount] = useState("");
	const amountCents = toCents(amount);
	const available = Math.max(0, savingsCents);
	const over = amountCents > available;

	const save = useMutation({
		mutationFn: () => add({ space, amountCents }),
		onSuccess: onClose,
	});
	const canSave = amountCents > 0 && !over && !save.isPending;
	const error =
		over || available === 0 ? `Solo tienes S/ ${formatCents(available)} en Ahorro.` : undefined;

	return (
		<DialogPopup>
			<DialogHeader>
				<DialogTitle>Aportar al fondo</DialogTitle>
				<p className="text-sm text-muted-foreground tabular-nums">
					S/ {formatCents(fundCents)}
					{fundGoalCents ? ` de S/ ${formatCents(fundGoalCents)}` : ""}
				</p>
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-4">
				<AmountField
					label="Monto"
					value={amount}
					onChange={setAmount}
					error={error ?? (save.isError ? readError(save.error) : undefined)}
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						className="h-11 rounded-full"
						onClick={() => setAmount(formatCents(QUICK_CENTS))}
					>
						S/ 100
					</Button>
					{available > 0 ? (
						<Button
							variant="outline"
							className="h-11 rounded-full"
							onClick={() => setAmount(formatCents(available))}
						>
							Todo el Ahorro · S/ {formatCents(available)}
						</Button>
					) : null}
				</div>
				<p className="text-sm text-muted-foreground">
					Sale del sobre Ahorro. No cuenta como gasto.
				</p>
			</DialogPanel>
			<DialogFooter>
				<Button
					className="h-11 rounded-full px-6"
					disabled={!canSave}
					loading={save.isPending}
					onClick={() => save.mutate()}
				>
					Aportar
				</Button>
			</DialogFooter>
		</DialogPopup>
	);
}

export function ContributeDialog({ open, ...props }: ContributeProps & { open: boolean }) {
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) props.onClose();
			}}
		>
			{open ? <ContributeForm {...props} /> : null}
		</Dialog>
	);
}
