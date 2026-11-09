import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, NAME_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
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
	FormSheet,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { MonthField } from "#/components/month-field";
import { useLimaDate } from "#/hooks/use-lima-date";
import { positiveMoney } from "#/lib/money-schema";
import { readError } from "#/lib/read-error";
import { AmountField } from "#/modules/commitments/components/amount-field";
import { FieldError } from "#/modules/commitments/components/field-error";
import type { Goal } from "./goal-card";

const goalSchema = z.object({
	name: z.string().check(z.refine((value) => value.trim() !== "", "Ponle un nombre.")),
	amount: positiveMoney("Define cuánto quieres juntar."),
	month: z.string(),
});

type GoalValues = z.infer<typeof goalSchema>;

type GoalFormProps = {
	space: FunctionArgs<typeof api.goals.add>["space"];
	goal?: Goal;
	onClose: () => void;
};

function GoalForm({ space, goal, onClose }: GoalFormProps) {
	const today = useLimaDate();
	const add = useConvexMutation(api.goals.add);
	const update = useConvexMutation(api.goals.update);
	const remove = useConvexMutation(api.goals.remove);
	const [confirmingRemove, setConfirmingRemove] = useState(false);

	const save = useMutation({
		mutationFn: (value: GoalValues) => {
			const fields = {
				space,
				name: value.name,
				targetCents: toCents(value.amount),
				...(value.month ? { targetMonth: value.month } : {}),
			};
			return goal ? update({ ...fields, id: goal.id }) : add(fields);
		},
		onSuccess: onClose,
	});
	const erase = useMutation({
		mutationFn: (id: Goal["id"]) => remove({ space, id }),
		onSuccess: onClose,
	});
	const defaultValues: GoalValues = {
		name: goal?.name ?? "",
		amount: goal ? formatCents(goal.targetCents) : "",
		month: goal?.targetMonth ?? "",
	};
	const form = useForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: goalSchema },
		onSubmit: ({ value }) => save.mutate(value),
	});

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
					<FormSheetTitle>{goal ? "Editar meta" : "Nueva meta"}</FormSheetTitle>
				</FormSheetHeader>
				<FormSheetPanel className="flex flex-col gap-5">
					<form.Field name="name">
						{(field) => {
							const message = field.state.meta.errors[0]?.message;
							return (
								<Field>
									<FieldLabel className="font-normal text-muted-foreground">
										Nombre de la meta
									</FieldLabel>
									<Input
										aria-invalid={message ? true : undefined}
										placeholder="ej. Viaje a Cusco"
										maxLength={NAME_MAX_LENGTH}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										className={cn(message && "border-warning")}
									/>
									<FieldError>{message}</FieldError>
								</Field>
							);
						}}
					</form.Field>

					<div>
						<p className="mb-1 text-sm text-muted-foreground">Meta</p>
						<form.Field name="amount">
							{(field) => (
								<AmountField
									large
									label="Meta"
									value={field.state.value}
									onChange={field.handleChange}
									error={field.state.meta.errors[0]?.message}
								/>
							)}
						</form.Field>
					</div>

					<form.Field name="month">
						{(field) => (
							<div>
								<MonthField value={field.state.value} onChange={field.handleChange} today={today} />
								{field.state.value ? (
									<Button
										type="button"
										variant="link"
										size="sm"
										className="px-0 text-muted-foreground"
										onClick={() => field.handleChange("")}
									>
										Quitar
									</Button>
								) : null}
							</div>
						)}
					</form.Field>

					{save.isError ? <FieldError>{readError(save.error)}</FieldError> : null}

					{goal ? (
						<div>
							<Button
								type="button"
								variant="link"
								size="sm"
								className="px-0 text-muted-foreground"
								onClick={() => setConfirmingRemove(true)}
							>
								Borrar meta
							</Button>
						</div>
					) : null}
				</FormSheetPanel>
				<FormSheetFooter variant="bare">
					<Button type="submit" className="h-11 w-full rounded-full" loading={save.isPending}>
						{goal ? "Guardar meta" : "Crear meta"}
					</Button>
				</FormSheetFooter>
			</form>

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
		</FormSheetPopup>
	);
}

/** Without `goal` it creates one; with `goal` it edits and can delete it. */
export function GoalFormDialog({ open, ...props }: GoalFormProps & { open: boolean }) {
	return (
		<FormSheet
			open={open}
			onOpenChange={(next) => {
				if (!next) props.onClose();
			}}
		>
			{open ? <GoalForm {...props} /> : null}
		</FormSheet>
	);
}
