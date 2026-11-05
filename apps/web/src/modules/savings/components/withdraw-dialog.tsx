import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, NOTE_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { useForm, useSelector } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import type { FunctionArgs } from "convex/server";
import * as z from "zod/mini";
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
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { positiveMoney } from "#/lib/money-schema";
import { readError } from "#/lib/read-error";
import { EYEBROW } from "#/lib/typography";
import { AmountField } from "#/modules/commitments/components/amount-field";

type Reason = FunctionArgs<typeof api.transactions.withdrawSaving>["reason"];

type WithdrawValues = { amount: string; reason: Reason; note: string };

const REASONS: { value: Reason; label: string }[] = [
	{ value: "emergency", label: "Emergencia" },
	{ value: "unexpected", label: "Algo imprevisto" },
	{ value: "mistake", label: "Me equivoqué al aportar" },
	{ value: "other", label: "Otro" },
];

const withdrawSchema = z.object({ amount: positiveMoney("Escribe un monto.") });

type WithdrawProps = {
	space: FunctionArgs<typeof api.transactions.withdrawSaving>["space"];
	fundCents: number;
	onClose: () => void;
};

function WithdrawForm({ space, fundCents, onClose }: WithdrawProps) {
	const withdraw = useConvexMutation(api.transactions.withdrawSaving);
	const save = useMutation({
		mutationFn: (value: WithdrawValues) =>
			withdraw({
				space,
				amountCents: toCents(value.amount),
				reason: value.reason,
				note: value.reason === "other" ? value.note.trim() || undefined : undefined,
			}),
		onSuccess: onClose,
	});
	const defaultValues: WithdrawValues = { amount: "", reason: "emergency", note: "" };
	const form = useForm({ defaultValues, onSubmit: ({ value }) => save.mutate(value) });
	const { amount, reason } = useSelector(form.store, (state) => state.values);
	const over = toCents(amount) > fundCents;
	const canSave = withdrawSchema.safeParse({ amount }).success && !over && !save.isPending;

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
					<DialogTitle>Retirar del fondo</DialogTitle>
					<DialogDescription>Tienes S/ {formatCents(fundCents)}</DialogDescription>
				</DialogHeader>
				<DialogPanel className="flex flex-col gap-5">
					<form.Field name="amount">
						{(field) => (
							<AmountField
								large
								label="Monto a retirar"
								value={field.state.value}
								onChange={field.handleChange}
								error={
									over
										? `Tu fondo tiene S/ ${formatCents(fundCents)}.`
										: save.isError
											? readError(save.error)
											: undefined
								}
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
				</DialogPanel>
				<DialogFooter variant="bare">
					<Button
						type="submit"
						className="h-11 w-full rounded-full"
						disabled={!canSave}
						loading={save.isPending}
					>
						Confirmar
					</Button>
				</DialogFooter>
			</form>
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
