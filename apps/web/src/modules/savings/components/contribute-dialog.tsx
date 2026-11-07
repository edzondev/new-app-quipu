import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { useForm, useSelector } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import type { FunctionArgs } from "convex/server";
import * as z from "zod/mini";
import { Button } from "#/components/ui/button";
import {
	FormSheet,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { positiveMoney } from "#/lib/money-schema";
import { readError } from "#/lib/read-error";
import { CHIP } from "#/lib/typography";
import { AmountField } from "#/modules/commitments/components/amount-field";
import type { Goal } from "./goal-card";

const QUICK_CENTS = 10_000;

const contributeSchema = z.object({ amount: positiveMoney("Escribe un monto.") });

/** Without `goal` the money goes to the emergency fund. */
type ContributeProps = {
	space: FunctionArgs<typeof api.transactions.addSaving>["space"];
	savingsCents: number;
	savedCents: number;
	targetCents: number | null;
	goal?: Pick<Goal, "id" | "name">;
	onClose: () => void;
};

function ContributeForm({
	space,
	savingsCents,
	savedCents,
	targetCents,
	goal,
	onClose,
}: ContributeProps) {
	const add = useConvexMutation(api.transactions.addSaving);
	const save = useMutation({
		mutationFn: (amountCents: number) =>
			add({ space, amountCents, ...(goal ? { goalId: goal.id } : {}) }),
		onSuccess: onClose,
	});
	const form = useForm({
		defaultValues: { amount: "" },
		onSubmit: ({ value }) => save.mutate(toCents(value.amount)),
	});
	const amount = useSelector(form.store, (state) => state.values.amount);
	const available = Math.max(0, savingsCents);
	const over = toCents(amount) > available;
	const shortcut = goal
		? { label: "Lo que falta", cents: Math.max(0, (targetCents ?? 0) - savedCents) }
		: { label: "Todo el Ahorro", cents: available };

	const canSave = contributeSchema.safeParse({ amount }).success && !over && !save.isPending;
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
					<FormSheetTitle>{goal ? `Aportar a ${goal.name}` : "Aportar al fondo"}</FormSheetTitle>
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
								error={error ?? (save.isError ? readError(save.error) : undefined)}
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
				<FormSheetFooter variant="bare">
					<Button
						type="submit"
						className="h-11 w-full rounded-full"
						disabled={!canSave}
						loading={save.isPending}
					>
						Aportar
					</Button>
				</FormSheetFooter>
			</form>
		</FormSheetPopup>
	);
}

export function ContributeDialog({ open, ...props }: ContributeProps & { open: boolean }) {
	return (
		<FormSheet
			open={open}
			onOpenChange={(next) => {
				if (!next) props.onClose();
			}}
		>
			{open ? <ContributeForm {...props} /> : null}
		</FormSheet>
	);
}
