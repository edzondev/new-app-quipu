import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import type { FunctionArgs } from "convex/server";
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
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { readError } from "#/lib/read-error";
import { CHIP } from "#/lib/typography";
import { AmountField } from "#/modules/commitments/components/amount-field";

const QUICK_CENTS = 10_000;

type ContributeProps = {
	space: FunctionArgs<typeof api.transactions.addSaving>["space"];
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
					large
					label="Monto"
					value={amount}
					onChange={setAmount}
					error={error ?? (save.isError ? readError(save.error) : undefined)}
				/>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						className={CHIP}
						onClick={() => setAmount(formatCents(QUICK_CENTS))}
					>
						S/ 100
					</button>
					{available > 0 ? (
						<button
							type="button"
							className={CHIP}
							onClick={() => setAmount(formatCents(available))}
						>
							Todo el Ahorro · S/ {formatCents(available)}
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
			</DialogPanel>
			<DialogFooter variant="bare">
				<Button
					className="h-11 w-full rounded-full"
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
