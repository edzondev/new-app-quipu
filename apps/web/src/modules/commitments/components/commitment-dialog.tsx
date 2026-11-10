import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, NAME_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import {
	choiceOfRule,
	dueDateFor,
	MAX_DAYS_BEFORE_END,
	type RuleKind,
	ruleFromChoice,
} from "@quipu/backend/shared/commitments";
import { formatWeekdayDay, isoDateSchema } from "@quipu/backend/shared/dates";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import * as z from "zod/mini";
import { ChoiceChips } from "#/components/choice-chips";
import { DateField } from "#/components/date-field";
import {
	FormSheet,
	FormSheetDescription,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { positiveMoney } from "#/lib/money-schema";
import { readError } from "#/lib/read-error";
import { adjustmentOf, type CommitmentItem } from "../commitment-view";
import { AmountField } from "./amount-field";
import { FieldError } from "./field-error";

const RULE_KINDS = ["day", "last", "beforeEnd", "mid"] as const satisfies readonly RuleKind[];

const commitmentSchema = z
	.object({
		name: z.string().check(z.refine((value) => value.trim() !== "", "Ponle un nombre.")),
		amount: positiveMoney("Escribe el monto de cada pago."),
		envelope: z.enum(["needs", "wants"]),
		frequency: z.enum(["monthly", "once"]),
		ruleKind: z.enum(RULE_KINDS),
		ruleAmount: z.string(),
		date: z.string(),
	})
	.check((ctx) => {
		const { frequency, ruleKind, ruleAmount, date } = ctx.value;
		const monthly = frequency === "monthly";
		const valid = monthly
			? ruleFromChoice(ruleKind, ruleAmount) !== null
			: isoDateSchema.safeParse(date).success;
		if (!valid) {
			ctx.issues.push({
				code: "custom",
				message: "Elige la fecha de vencimiento.",
				path: [monthly ? "ruleAmount" : "date"],
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

const RULE_LABELS: Record<RuleKind, string> = {
	day: "Un día fijo",
	last: "El último día del mes",
	beforeEnd: "Días antes del fin",
	mid: "En quincena (el 15)",
};

const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1));
const DAYS_BEFORE_END = Array.from({ length: MAX_DAYS_BEFORE_END }, (_, index) =>
	String(index + 1),
);

const SELECT_CLASS =
	"min-h-11 rounded-full bg-muted px-4 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function initialValues(item: CommitmentItem | null): CommitmentValues {
	if (!item) {
		return {
			name: "",
			amount: "",
			envelope: "needs",
			frequency: "monthly",
			ruleKind: "day",
			ruleAmount: "",
			date: "",
		};
	}
	const rule = item.rule ? choiceOfRule(item.rule) : { kind: "day" as const, amount: "" };
	return {
		name: item.name,
		amount: (item.amountCents / 100).toFixed(2),
		envelope: item.envelope,
		frequency: item.frequency,
		ruleKind: rule.kind,
		ruleAmount: rule.amount,
		date: item.frequency === "once" ? item.dueDate : "",
	};
}

function CommitmentForm({
	space,
	item,
	today,
	onDone,
}: {
	space: "personal" | "household";
	item: CommitmentItem | null;
	today: string;
	onDone: () => void;
}) {
	const add = useConvexMutation(api.commitments.add);
	const update = useConvexMutation(api.commitments.update);
	const save = useMutation({
		mutationFn: (value: CommitmentValues) => {
			const rule = ruleFromChoice(value.ruleKind, value.ruleAmount);
			const args = {
				space,
				name: value.name,
				amountCents: toCents(value.amount),
				envelope: value.envelope,
				schedule:
					value.frequency === "monthly" && rule
						? { frequency: value.frequency, rule }
						: { frequency: "once" as const, dueDate: value.date },
			};
			return item ? update({ ...args, id: item.id }) : add(args);
		},
		onSuccess: onDone,
	});
	const form = useForm({
		defaultValues: initialValues(item),
		validationLogic: revalidateLogic(),
		validators: { onDynamic: commitmentSchema },
		onSubmit: ({ value }) => save.mutate(value),
	});
	const values = useSelector(form.store, (state) => state.values);
	const rule = ruleFromChoice(values.ruleKind, values.ruleAmount);
	const thisMonth = rule
		? dueDateFor(rule, item ? adjustmentOf(item) : undefined, today.slice(0, 7))
		: null;

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
					<FormSheetTitle>{item ? "Editar compromiso" : "Añadir compromiso"}</FormSheetTitle>
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

					{values.frequency === "monthly" ? (
						<form.Field name="ruleAmount">
							{(amountField) => {
								const message = amountField.state.meta.errors[0]?.message;
								return (
									<div>
										<div className="flex flex-wrap items-center gap-3">
											<Label className="flex items-center gap-3 text-sm font-normal text-muted-foreground">
												Vence
												<form.Field name="ruleKind">
													{(kindField) => (
														<select
															value={kindField.state.value}
															onChange={(event) => {
																const next = RULE_KINDS.find((kind) => kind === event.target.value);
																if (!next) return;
																kindField.handleChange(next);
																amountField.handleChange("");
															}}
															className={SELECT_CLASS}
														>
															{RULE_KINDS.map((kind) => (
																<option key={kind} value={kind}>
																	{RULE_LABELS[kind]}
																</option>
															))}
														</select>
													)}
												</form.Field>
											</Label>
											{values.ruleKind === "day" || values.ruleKind === "beforeEnd" ? (
												<select
													aria-label={
														values.ruleKind === "day" ? "Día del mes" : "Días antes del fin"
													}
													aria-invalid={message ? true : undefined}
													value={amountField.state.value}
													onChange={(event) => amountField.handleChange(event.target.value)}
													className={cn(SELECT_CLASS, message && "border border-warning")}
												>
													<option value="">{values.ruleKind === "day" ? "Día" : "Días"}</option>
													{(values.ruleKind === "day" ? MONTH_DAYS : DAYS_BEFORE_END).map(
														(number) => (
															<option key={number} value={number}>
																{number}
															</option>
														),
													)}
												</select>
											) : null}
										</div>
										{thisMonth ? (
											<p className="mt-2 text-sm text-muted-foreground">
												Este mes vence el {formatWeekdayDay(thisMonth)}.
											</p>
										) : null}
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
										<DateField
											value={field.state.value}
											onChange={field.handleChange}
											today={today}
											invalid={Boolean(message)}
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
						{item ? "Guardar cambios" : "Guardar compromiso"}
					</Button>
				</FormSheetFooter>
			</form>
		</FormSheetPopup>
	);
}

/** `target` is the space it was opened in and, to edit, the commitment; null keeps it closed. */
export function CommitmentDialog({
	target,
	today,
	onClose,
}: {
	target: { space: "personal" | "household"; item: CommitmentItem | null } | null;
	today: string;
	onClose: () => void;
}) {
	return (
		<FormSheet
			open={target !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			{target ? (
				<CommitmentForm space={target.space} item={target.item} today={today} onDone={onClose} />
			) : null}
		</FormSheet>
	);
}
