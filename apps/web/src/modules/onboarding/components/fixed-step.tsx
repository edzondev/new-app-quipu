import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import { getFirstCycleRange } from "@quipu/backend/shared/dates";
import { MAX_MONTH_DAY, parseStartDay } from "@quipu/backend/shared/plan";
import { getPreview } from "@quipu/backend/shared/preview";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { ConvexError } from "convex/values";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Field, FieldError } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import {
	type CommitmentKind,
	createFixedStepSchema,
	type FixedStepValues,
	getCommitmentsCents,
	type OnboardingValues,
	toCommitmentInputs,
} from "#/modules/onboarding/schemas";

const COMMITMENT_OPTIONS: { kind: CommitmentKind; label: string }[] = [
	{ kind: "rent", label: "Alquiler" },
	{ kind: "phone", label: "Celular" },
	{ kind: "internet", label: "Internet" },
	{ kind: "utilities", label: "Servicios" },
	{ kind: "other", label: "Otro" },
];

const DAYS_OF_MONTH = Array.from({ length: MAX_MONTH_DAY }, (_, index) => index + 1);

type Props = {
	values: OnboardingValues;
	today: string;
	onBack: (value: FixedStepValues) => void;
};

export function FixedStep({ values, today, onBack }: Props) {
	const navigate = useNavigate();
	const completeOnboarding = useConvexMutation(api.profiles.completeOnboarding);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [commitmentsOpen, setCommitmentsOpen] = useState(false);
	const { cycleStep, splitStep } = values;
	const todayCents = toCents(cycleStep.todayAmount);
	const cycleIncomeCents = toCents(cycleStep.cycleIncome);
	const startDay = parseStartDay(cycleStep.startDay);

	const form = useForm({
		defaultValues: values.fixedStep,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: createFixedStepSchema(todayCents) },
		onSubmit: async ({ value }) => {
			setSaveError(null);
			try {
				await completeOnboarding({
					cadence: cycleStep.cadence,
					cycleStartDay: startDay,
					incomeCents: cycleIncomeCents,
					todayCents,
					split: splitStep.split,
					commitments: toCommitmentInputs(value.commitments),
				});
				await navigate({ to: "/home", replace: true });
			} catch (error) {
				setSaveError(
					error instanceof ConvexError
						? String(error.data)
						: "No pudimos guardar. Inténtalo otra vez.",
				);
			}
		},
	});
	const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
	const commitments = useSelector(form.store, (state) => state.values.commitments);
	const commitmentInputs = toCommitmentInputs(commitments);
	const commitmentsCents = getCommitmentsCents(commitmentInputs);
	const cycle = getFirstCycleRange(cycleStep.cadence, startDay, today);
	const preview = getPreview({
		incomeCents: todayCents,
		commitments: commitmentInputs,
		split: splitStep.split,
		cycleEnd: cycle.endDate,
		today,
	});

	async function startCycle() {
		await form.handleSubmit();
		if (!form.state.isValid) setCommitmentsOpen(true);
	}

	return (
		<>
			<StepHeader title="Tu número" onBack={() => onBack(form.state.values)} />
			<form
				noValidate
				className="mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					void startCycle();
				}}
			>
				<p className="text-xs text-muted-foreground">Puedes gastar hoy</p>
				<p className="mt-3 flex items-baseline gap-3">
					<span className="text-2xl text-muted-foreground">S/</span>
					<span className="text-5xl leading-tight tabular-nums sm:text-6xl">
						{formatCents(preview.dailyCents)}
					</span>
				</p>
				<div className="mt-6 flex flex-col gap-1 text-xs tabular-nums text-muted-foreground">
					<p>
						Hoy S/ {formatCents(todayCents)}
						{commitmentsCents > 0 ? ` · Compromisos S/ ${formatCents(commitmentsCents)}` : null}
					</p>
					<p>
						Necesidades S/ {formatCents(preview.needsCents)} · Gustos S/{" "}
						{formatCents(preview.wantsCents)} · Ahorro S/ {formatCents(preview.savingsCents)}
					</p>
				</div>
				<Button
					type="submit"
					variant="default"
					size="xl"
					className="mt-8 h-12 rounded-full px-8"
					disabled={isSubmitting}
					loading={isSubmitting}
				>
					Empezar mi ciclo
				</Button>

				{saveError ? (
					<p role="alert" className="mt-3 text-xs text-warning-foreground">
						{saveError}
					</p>
				) : null}

				<form.Field name="commitments" mode="array">
					{(field) => {
						const isInvalid = !field.state.meta.isValid;
						const errorMessage = field.state.meta.errors[0]?.message;
						return (
							<>
								<Collapsible
									open={commitmentsOpen}
									onOpenChange={setCommitmentsOpen}
									className="mt-10 border-t border-border pt-5"
								>
									<CollapsibleTrigger
										render={
											<Button
												variant="ghost"
												className="h-auto w-full justify-between p-0 text-sm font-normal hover:bg-transparent data-panel-open:[&_svg]:rotate-180 [&_svg]:transition-transform"
											/>
										}
									>
										¿Pagas cosas fijas cada mes?
										<ChevronDown strokeWidth={1.5} />
									</CollapsibleTrigger>
									<CollapsiblePanel>
										<div className="mt-5 flex flex-wrap gap-2">
											{COMMITMENT_OPTIONS.filter(
												(option) =>
													!field.state.value.some((commitment) => commitment.kind === option.kind),
											).map((option) => (
												<Button
													key={option.kind}
													type="button"
													variant="secondary"
													size="sm"
													className="rounded-full text-xs sm:text-xs"
													onClick={() =>
														field.pushValue({
															kind: option.kind,
															name: option.kind === "other" ? "" : option.label,
															amount: "",
															day: "1",
														})
													}
												>
													{option.label}
												</Button>
											))}
										</div>
										{field.state.value.map((commitment, index) => (
											<div key={commitment.kind} className="border-b border-border py-4">
												<div className="flex items-center justify-between gap-3">
													{commitment.kind === "other" ? (
														<form.Field name={`commitments[${index}].name`}>
															{(nameField) => {
																const nameError = nameField.state.meta.errors[0]?.message;
																return (
																	<div className="flex-1">
																		<Input
																			name={nameField.name}
																			aria-label="Nombre del compromiso"
																			placeholder="Nombre"
																			value={nameField.state.value}
																			onBlur={nameField.handleBlur}
																			onChange={(e) => nameField.handleChange(e.target.value)}
																			unstyled
																			className="w-full border-0 border-b border-neutral-400 bg-transparent has-focus-visible:border-foreground [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-1 [&_[data-slot=input]]:text-sm"
																		/>
																		{nameError ? (
																			<p
																				role="alert"
																				className="mt-2 text-xs text-warning-foreground"
																			>
																				{nameError}
																			</p>
																		) : null}
																	</div>
																);
															}}
														</form.Field>
													) : (
														<span className="text-sm">{commitment.name}</span>
													)}
													<Button
														type="button"
														variant="ghost"
														className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground sm:text-xs"
														onClick={() => field.removeValue(index)}
													>
														Quitar
													</Button>
												</div>
												<div className="mt-3 flex items-center justify-between gap-4">
													<form.Field name={`commitments[${index}].amount`}>
														{(amountField) => {
															const amountError = amountField.state.meta.errors[0]?.message;
															return (
																<div>
																	<div className="flex w-36 items-baseline gap-2 border-b border-neutral-400 has-focus-visible:border-foreground">
																		<span className="text-sm text-muted-foreground">S/</span>
																		<Input
																			name={amountField.name}
																			inputMode="decimal"
																			autoComplete="off"
																			aria-label={`Monto de ${commitment.name || "Otro"}`}
																			placeholder="0.00"
																			value={amountField.state.value}
																			onBlur={amountField.handleBlur}
																			onChange={(e) => amountField.handleChange(e.target.value)}
																			unstyled
																			className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-1 [&_[data-slot=input]]:text-sm [&_[data-slot=input]]:tabular-nums"
																		/>
																	</div>
																	{amountError ? (
																		<p
																			role="alert"
																			className="mt-2 text-xs text-warning-foreground"
																		>
																			{amountError}
																		</p>
																	) : null}
																</div>
															);
														}}
													</form.Field>
													<form.Field name={`commitments[${index}].day`}>
														{(dayField) => (
															<label className="flex items-center gap-2 text-xs text-muted-foreground">
																Día
																<select
																	name={dayField.name}
																	value={dayField.state.value}
																	onBlur={dayField.handleBlur}
																	onChange={(e) => dayField.handleChange(e.target.value)}
																	className="rounded-full bg-muted px-3 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
																>
																	{DAYS_OF_MONTH.map((day) => (
																		<option key={day} value={String(day)}>
																			{day}
																		</option>
																	))}
																</select>
															</label>
														)}
													</form.Field>
												</div>
											</div>
										))}
									</CollapsiblePanel>
								</Collapsible>
								{isInvalid && errorMessage ? (
									<Field name={field.name} invalid>
										<FieldError match className="mt-3 text-xs text-warning-foreground">
											{errorMessage}
										</FieldError>
									</Field>
								) : null}
							</>
						);
					}}
				</form.Field>
			</form>
		</>
	);
}
