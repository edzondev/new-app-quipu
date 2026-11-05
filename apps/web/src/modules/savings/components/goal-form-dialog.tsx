import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, NAME_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
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
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { readError } from "#/lib/read-error";
import { AmountField } from "#/modules/commitments/components/amount-field";
import { FieldError } from "#/modules/commitments/components/field-error";
import type { Goal } from "./goal-card";

type GoalFormProps = {
	space: FunctionArgs<typeof api.goals.add>["space"];
	goal?: Goal;
	onClose: () => void;
};

function GoalForm({ space, goal, onClose }: GoalFormProps) {
	const add = useConvexMutation(api.goals.add);
	const update = useConvexMutation(api.goals.update);
	const remove = useConvexMutation(api.goals.remove);
	const [name, setName] = useState(goal?.name ?? "");
	const [amount, setAmount] = useState(goal ? formatCents(goal.targetCents) : "");
	const [month, setMonth] = useState(goal?.targetMonth ?? "");
	const [tried, setTried] = useState(false);
	const [confirmingRemove, setConfirmingRemove] = useState(false);

	const targetCents = toCents(amount);
	const errors = {
		name: name.trim() ? undefined : "Ponle un nombre.",
		amount: targetCents > 0 ? undefined : "Define cuánto quieres juntar.",
	};
	const shown: Partial<typeof errors> = tried ? errors : {};

	const save = useMutation({
		mutationFn: () => {
			const fields = { space, name, targetCents, ...(month ? { targetMonth: month } : {}) };
			return goal ? update({ ...fields, id: goal.id }) : add(fields);
		},
		onSuccess: onClose,
	});
	const erase = useMutation({
		mutationFn: (id: Goal["id"]) => remove({ space, id }),
		onSuccess: onClose,
	});

	function submit() {
		setTried(true);
		if (!errors.name && !errors.amount) save.mutate();
	}

	return (
		<DialogPopup>
			<DialogHeader>
				<DialogTitle>{goal ? "Editar meta" : "Nueva meta"}</DialogTitle>
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-5">
				<Field>
					<FieldLabel className="font-normal text-muted-foreground">Nombre de la meta</FieldLabel>
					<Input
						aria-invalid={shown.name ? true : undefined}
						placeholder="ej. Viaje a Cusco"
						maxLength={NAME_MAX_LENGTH}
						value={name}
						onChange={(event) => setName(event.target.value)}
						className={cn(shown.name && "border-warning")}
					/>
					<FieldError>{shown.name}</FieldError>
				</Field>

				<div>
					<p className="mb-1 text-sm text-muted-foreground">Meta</p>
					<AmountField
						large
						label="Meta"
						value={amount}
						onChange={setAmount}
						error={shown.amount}
					/>
				</div>

				<Field>
					<FieldLabel className="font-normal text-muted-foreground">
						Para cuándo · opcional
					</FieldLabel>
					<Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
				</Field>

				{save.isError ? <FieldError>{readError(save.error)}</FieldError> : null}

				{goal ? (
					<div>
						<Button
							variant="link"
							size="sm"
							className="px-0 text-muted-foreground"
							onClick={() => setConfirmingRemove(true)}
						>
							Borrar meta
						</Button>
					</div>
				) : null}
			</DialogPanel>
			<DialogFooter variant="bare">
				<Button className="h-11 w-full rounded-full" loading={save.isPending} onClick={submit}>
					{goal ? "Guardar meta" : "Crear meta"}
				</Button>
			</DialogFooter>

			{goal ? (
				<AlertDialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
					<AlertDialogPopup>
						<AlertDialogHeader>
							<AlertDialogTitle>¿Borrar la meta?</AlertDialogTitle>
							<AlertDialogDescription>
								{goal.savedCents > 0
									? `Lo que ahorraste en «${goal.name}», S/ ${formatCents(goal.savedCents)}, pasa a tu fondo de emergencia. No se pierde nada.`
									: `«${goal.name}» no tiene dinero ahorrado. Solo se borra la meta.`}
							</AlertDialogDescription>
						</AlertDialogHeader>
						{erase.isError ? (
							<p role="alert" className="px-6 pb-4 text-xs text-warning-foreground">
								{readError(erase.error)}
							</p>
						) : null}
						<AlertDialogFooter>
							<Button
								variant="outline"
								loading={erase.isPending}
								onClick={() => erase.mutate(goal.id)}
							>
								Borrar meta
							</Button>
							<AlertDialogClose render={<Button />}>Mantener meta</AlertDialogClose>
						</AlertDialogFooter>
					</AlertDialogPopup>
				</AlertDialog>
			) : null}
		</DialogPopup>
	);
}

/** Without `goal` it creates one; with `goal` it edits and can delete it. */
export function GoalFormDialog({ open, ...props }: GoalFormProps & { open: boolean }) {
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) props.onClose();
			}}
		>
			{open ? <GoalForm {...props} /> : null}
		</Dialog>
	);
}
