import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, NAME_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { isoDateSchema } from "@quipu/backend/shared/dates";
import { MAX_MONTH_DAY, monthDaySchema } from "@quipu/backend/shared/plan";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import * as z from "zod/mini";
import { ChoiceChips } from "#/components/choice-chips";
import { Button } from "#/components/ui/button";
import {
	FormSheet,
	FormSheetDescription,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";
import { Input } from "#/components/ui/input";
import { positiveMoney } from "#/lib/money-schema";
import { readError } from "#/lib/read-error";
import { AmountField } from "./amount-field";
import { FieldError } from "./field-error";

const commitmentSchema = z
	.object({
		name: z.string().check(z.refine((value) => value.trim() !== "", "Ponle un nombre.")),
		amount: positiveMoney("Escribe el monto de cada pago."),
		envelope: z.enum(["needs", "wants"]),
		frequency: z.enum(["monthly", "once"]),
		day: z.string(),
		date: z.string(),
	})
	.check((ctx) => {
		const { frequency, day, date } = ctx.value;
		const monthly = frequency === "monthly";
		const valid = monthly
			? monthDaySchema.safeParse(Number(day)).success
			: isoDateSchema.safeParse(date).success;
		if (!valid) {
			ctx.issues.push({
				code: "custom",
				message: "Elige la fecha de vencimiento.",
				path: [monthly ? "day" : "date"],
				input: ctx.value,
			});
		}
	});

type CommitmentValues = z.infer<typeof commitmentSchema>;

const ENVELOPES: { value: CommitmentValues["envelope"]; label: string }[] = [
	{ value: "needs", label: ENVELOPE_LABELS.needs },
	{ value: "wants", label: ENVELOPE_LABELS.wants },
];

const FREQUENCIES: { value: CommitmentValues["frequency"]; label: string }[] = [
	{ value: "monthly", label: "Cada mes" },
	{ value: "once", label: "Una vez" },
];

function AddCommitmentForm({
	space,
	onDone,
}: {
	space: "personal" | "household";
	onDone: () => void;
}) {
	const add = useConvexMutation(api.commitments.add);
	const save = useMutation({
		mutationFn: (value: CommitmentValues) =>
			add({
				space,
				name: value.name,
				amountCents: toCents(value.amount),
				envelope: value.envelope,
				schedule:
					value.frequency === "monthly"
						? { frequency: value.frequency, dueDay: Number(value.day) }
						: { frequency: value.frequency, dueDate: value.date },
			}),
		onSuccess: onDone,
	});
	const defaultValues: CommitmentValues = {
		name: "",
		amount: "",
		envelope: "needs",
		frequency: "monthly",
		day: "",
		date: "",
	};
	const form = useForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: commitmentSchema },
		onSubmit: ({ value }) => save.mutate(value),
	});
	const frequency = useSelector(form.store, (state) => state.values.frequency);

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
					<FormSheetTitle>Añadir compromiso</FormSheetTitle>
					<FormSheetDescription>Quipu lo reserva antes de que gastes.</FormSheetDescription>
				</FormSheetHeader>
				<FormSheetPanel className="flex flex-col gap-5">
					<form.Field name="name">
						{(field) => {
							const message = field.state.meta.errors[0]?.message;
							return (
								<div>
									<Input
										aria-label="Nombre"
										aria-invalid={message ? true : undefined}
										placeholder="ej. Luz del Sur"
										maxLength={NAME_MAX_LENGTH}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										className={cn(message && "border-warning")}
									/>
									<FieldError>{message}</FieldError>
								</div>
							);
						}}
					</form.Field>

					<form.Field name="amount">
						{(field) => (
							<AmountField
								label="Monto"
								value={field.state.value}
								onChange={field.handleChange}
								error={field.state.meta.errors[0]?.message}
							/>
						)}
					</form.Field>

					<form.Field name="envelope">
						{(field) => (
							<ChoiceChips
								label="Sale de"
								options={ENVELOPES}
								value={field.state.value}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
					<form.Field name="frequency">
						{(field) => (
							<ChoiceChips
								label="Frecuencia"
								options={FREQUENCIES}
								value={field.state.value}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>

					{frequency === "monthly" ? (
						<form.Field name="day">
							{(field) => {
								const message = field.state.meta.errors[0]?.message;
								return (
									<div>
										<Input
											type="number"
											inputMode="numeric"
											min={1}
											max={MAX_MONTH_DAY}
											aria-label="Vence"
											aria-invalid={message ? true : undefined}
											placeholder="Vence"
											value={field.state.value}
											onChange={(event) => field.handleChange(event.target.value)}
											className={cn(message && "border-warning")}
										/>
										<FieldError>{message}</FieldError>
									</div>
								);
							}}
						</form.Field>
					) : (
						<form.Field name="date">
							{(field) => {
								const message = field.state.meta.errors[0]?.message;
								return (
									<div>
										<Input
											type="date"
											aria-label="Vence"
											aria-invalid={message ? true : undefined}
											value={field.state.value}
											onChange={(event) => field.handleChange(event.target.value)}
											className={cn(message && "border-warning")}
										/>
										<FieldError>{message}</FieldError>
									</div>
								);
							}}
						</form.Field>
					)}

					{save.isError ? <FieldError>{readError(save.error)}</FieldError> : null}
				</FormSheetPanel>
				<FormSheetFooter>
					<Button type="button" variant="ghost" onClick={onDone}>
						Cancelar
					</Button>
					<Button type="submit" loading={save.isPending}>
						Guardar compromiso
					</Button>
				</FormSheetFooter>
			</form>
		</FormSheetPopup>
	);
}

/** `space` is the one the dialog was opened in; null keeps it closed. */
export function AddCommitmentDialog({
	space,
	onClose,
}: {
	space: "personal" | "household" | null;
	onClose: () => void;
}) {
	return (
		<FormSheet
			open={space !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			{space ? <AddCommitmentForm space={space} onDone={onClose} /> : null}
		</FormSheet>
	);
}
