import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, NOTE_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import { useState } from "react";
import { ChoiceChips } from "#/components/choice-chips";
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
import { readError } from "#/lib/read-error";
import { AmountField } from "#/modules/commitments/components/amount-field";

type Reason = FunctionArgs<typeof api.transactions.withdrawSaving>["reason"];

const REASONS: { value: Reason; label: string }[] = [
	{ value: "emergency", label: "Emergencia" },
	{ value: "unexpected", label: "Algo imprevisto" },
	{ value: "mistake", label: "Me equivoqué al aportar" },
	{ value: "other", label: "Otro" },
];

type WithdrawProps = {
	space: "personal" | "household";
	fundCents: number;
	onClose: () => void;
};

function WithdrawForm({ space, fundCents, onClose }: WithdrawProps) {
	const withdraw = useConvexMutation(api.transactions.withdrawSaving);
	const [amount, setAmount] = useState("");
	const [reason, setReason] = useState<Reason>("emergency");
	const [note, setNote] = useState("");
	const amountCents = toCents(amount);
	const over = amountCents > fundCents;

	const save = useMutation({
		mutationFn: () =>
			withdraw({
				space,
				amountCents,
				reason,
				note: reason === "other" ? note.trim() || undefined : undefined,
			}),
		onSuccess: onClose,
	});
	const canSave = amountCents > 0 && !over && !save.isPending;

	return (
		<DialogPopup>
			<DialogHeader>
				<DialogTitle>Retirar del fondo</DialogTitle>
				<DialogDescription>Tienes S/ {formatCents(fundCents)}</DialogDescription>
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-5">
				<AmountField
					label="Monto a retirar"
					value={amount}
					onChange={setAmount}
					error={
						over
							? `Tu fondo tiene S/ ${formatCents(fundCents)}.`
							: save.isError
								? readError(save.error)
								: undefined
					}
				/>
				<div className="flex flex-col gap-2">
					<p aria-hidden className="text-sm text-muted-foreground">
						Motivo
					</p>
					<ChoiceChips label="Motivo" options={REASONS} value={reason} onChange={setReason} />
				</div>
				{reason === "other" ? (
					<Input
						aria-label="¿Para qué?"
						placeholder="¿Para qué?"
						maxLength={NOTE_MAX_LENGTH}
						value={note}
						onChange={(event) => setNote(event.target.value)}
					/>
				) : null}
				<p className="text-sm text-muted-foreground">Pasa a Necesidades de este ciclo.</p>
			</DialogPanel>
			<DialogFooter>
				<Button
					className="h-11 rounded-full px-6"
					disabled={!canSave}
					loading={save.isPending}
					onClick={() => save.mutate()}
				>
					Confirmar
				</Button>
			</DialogFooter>
		</DialogPopup>
	);
}

export function WithdrawDialog({ open, ...props }: WithdrawProps & { open: boolean }) {
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) props.onClose();
			}}
		>
			{open ? <WithdrawForm {...props} /> : null}
		</Dialog>
	);
}
