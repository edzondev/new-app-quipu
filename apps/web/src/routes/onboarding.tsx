import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { ConvexError } from "convex/values";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import {
	formatCents,
	formatShortDate,
	getCommitmentsCents,
	getCycle,
	getLimaToday,
	getPreview,
	toCents,
} from "#/modules/onboarding/preview";
import {
	type Cadence,
	type CommitmentKind,
	createFixedStepSchema,
	cycleStepSchema,
	type OnboardingValues,
	splitStepSchema,
} from "#/modules/onboarding/schemas";

export const Route = createFileRoute("/onboarding")({
	beforeLoad: async ({ context }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient.query(convexQuery(api.profiles.myProfile, {}));
		if (profile?.plan) throw redirect({ to: "/home" });
	},
	head: () => ({
		meta: [
			{ title: "Quipu — Primeros pasos" },
			{
				name: "description",
				content: "Tu ingreso, tus sobres y cuánto puedes gastar hoy, en tres pasos.",
			},
		],
	}),
	component: OnboardingPage,
});

const STEPS = ["cycle", "split", "fixed"] as const;
type Step = (typeof STEPS)[number];

const defaultValues: OnboardingValues = {
	cycleStep: { cadence: "monthly", startDay: "1", amount: "" },
	splitStep: { split: { needs: 50, wants: 30, savings: 20 } },
	fixedStep: { commitments: [] },
};

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
	{ value: "monthly", label: "Cada mes" },
	{ value: "biweekly", label: "Cada quincena" },
	{ value: "weekly", label: "Cada semana" },
];

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1);

const ENVELOPES = [
	{ key: "needs", label: "Necesidades", dot: "bg-sky-800" },
	{ key: "wants", label: "Gustos", dot: "bg-orange-600" },
	{ key: "savings", label: "Ahorro", dot: "bg-teal-700" },
] as const;

const COMMITMENT_OPTIONS: { kind: CommitmentKind; label: string }[] = [
	{ kind: "rent", label: "Alquiler" },
	{ kind: "phone", label: "Celular" },
	{ kind: "internet", label: "Internet" },
	{ kind: "utilities", label: "Servicios" },
	{ kind: "other", label: "Otro" },
];

const submitWith = (submit: () => Promise<unknown>) => (e: SubmitEvent) => {
	e.preventDefault();
	e.stopPropagation();
	void submit();
};

function OnboardingPage() {
	const navigate = useNavigate();
	const completeOnboarding = useConvexMutation(api.profiles.completeOnboarding);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [step, setStep] = useState<Step>("cycle");
	const [today] = useState(() => getLimaToday());

	const form = useForm({
		defaultValues,
		validationLogic: revalidateLogic(),
	});

	const values = useSelector(form.store, (state) => state.values);
	const incomeCents = toCents(values.cycleStep.amount);
	const commitmentsCents = getCommitmentsCents(values.fixedStep.commitments);
	const cycle = getCycle(values.cycleStep.cadence, values.cycleStep.startDay, today);
	const preview = getPreview({
		incomeCents,
		commitmentsCents,
		split: values.splitStep.split,
		cycleEnd: cycle.end,
		today,
	});
	const stepNumber = STEPS.indexOf(step) + 1;

	function goBack() {
		if (step === "split") {
			form.setFieldMeta("splitStep.split", (meta) => ({
				...meta,
				errorMap: {},
			}));
			setStep("cycle");
		} else if (step === "fixed") {
			form.setFieldMeta("fixedStep.commitments", (meta) => ({
				...meta,
				errorMap: {},
			}));
			setStep("split");
		}
	}

	return (
		<div className="min-h-svh bg-background text-foreground">
			<header className="mx-auto flex w-full max-w-360 items-center px-7 py-8 sm:px-12 sm:py-10">
				<Link to="/" aria-label="Quipu, entrada" className="inline-flex items-center gap-2.5">
					<svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
						<path d="M3 6h22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						<path
							d="M8 6v10"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							opacity="0.45"
						/>
						<path d="M14 6v16" stroke="#c45c2a" strokeWidth="1.8" strokeLinecap="round" />
						<path
							d="M20 6v8"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							opacity="0.45"
						/>
						<circle cx="8" cy="16" r="1.9" fill="currentColor" opacity="0.45" />
						<circle cx="14" cy="22" r="2.4" fill="#c45c2a" />
						<circle cx="20" cy="14" r="1.9" fill="currentColor" opacity="0.45" />
					</svg>
					<span className="text-2xl font-medium tracking-tight">Quipu</span>
				</Link>
			</header>

			<main className="mx-auto w-full max-w-170 px-7 pb-16 pt-6 sm:pt-12">
				<div className="flex items-center gap-4">
					<div
						role="progressbar"
						aria-label="Primeros pasos"
						aria-valuemin={1}
						aria-valuemax={STEPS.length}
						aria-valuenow={stepNumber}
						className="flex flex-1 gap-1.5"
					>
						{STEPS.map((s, i) => (
							<span
								key={s}
								className={cn(
									"h-1 flex-1 rounded-full",
									i < stepNumber ? "bg-foreground" : "bg-muted",
								)}
							/>
						))}
					</div>
					<span className="text-xs tabular-nums text-muted-foreground">
						{stepNumber} de {STEPS.length}
					</span>
				</div>

				{step !== "cycle" ? (
					<Button
						type="button"
						variant="ghost"
						className="mt-6 h-8 gap-2 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
						onClick={goBack}
					>
						<ArrowLeft strokeWidth={1.5} />
						Volver
					</Button>
				) : null}

				{step === "cycle" && (
					<>
						<h1 className="mt-9 text-4xl font-normal leading-tight tracking-tight sm:text-5xl">
							¿Cada cuánto quieres planear?
						</h1>
						<form.FormGroup
							name="cycleStep"
							validators={{ onDynamic: cycleStepSchema }}
							onGroupSubmit={() => {
								setStep("split");
							}}
						>
							{(group) => (
								<form noValidate className="mt-8" onSubmit={submitWith(() => group.handleSubmit())}>
									<form.Field
										name="cycleStep.cadence"
										listeners={{
											onChange: () => form.setFieldValue("cycleStep.startDay", "1"),
										}}
									>
										{(field) => (
											<ToggleGroup
												aria-label="Cada cuánto planear"
												value={[field.state.value]}
												onValueChange={(value) => {
													const option = CADENCE_OPTIONS.find((item) => item.value === value[0]);
													if (!option) return;
													field.handleChange(option.value);
												}}
												className="rounded-full bg-muted p-1"
											>
												{CADENCE_OPTIONS.map((option) => (
													<ToggleGroupItem
														key={option.value}
														value={option.value}
														className="h-8 rounded-full px-3 text-xs before:rounded-full hover:bg-transparent data-pressed:bg-foreground data-pressed:text-background data-pressed:hover:bg-foreground sm:h-8 sm:px-4 sm:text-xs"
													>
														{option.label}
													</ToggleGroupItem>
												))}
											</ToggleGroup>
										)}
									</form.Field>

									<form.Field name="cycleStep.startDay">
										{(field) => (
											<label className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
												Empieza el
												<select
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													className="rounded-full bg-muted px-4 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
												>
													{values.cycleStep.cadence === "weekly" ? (
														WEEKDAYS.map((weekday, index) => (
															<option key={weekday} value={String(index)}>
																{weekday}
															</option>
														))
													) : (
														<>
															{DAYS_OF_MONTH.map((day) => (
																<option key={day} value={String(day)}>
																	Día {day}
																</option>
															))}
															<option value="last">Último día del mes</option>
														</>
													)}
												</select>
											</label>
										)}
									</form.Field>
									<p className="mt-3 text-xs text-muted-foreground">
										Tu ciclo: {formatShortDate(cycle.start)} – {formatShortDate(cycle.end)}
									</p>

									<form.Field name="cycleStep.amount">
										{(field) => {
											const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
											const errorMessage = field.state.meta.errors[0];
											return (
												<Field name={field.name} invalid={isInvalid} className="mt-12">
													<FieldLabel className="text-sm font-normal text-muted-foreground">
														¿Con cuánto cuentas para este ciclo?
													</FieldLabel>
													<div className="mt-3 flex w-full items-baseline gap-3 border-b border-neutral-400 pb-3 has-focus-visible:border-foreground has-aria-invalid:border-amber-500">
														<span className="text-2xl text-muted-foreground">S/</span>
														<Input
															name={field.name}
															inputMode="decimal"
															autoComplete="off"
															aria-label="Con cuánto cuentas para este ciclo"
															placeholder="0.00"
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) => field.handleChange(e.target.value)}
															unstyled
															className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:text-5xl [&_[data-slot=input]]:leading-tight [&_[data-slot=input]]:tabular-nums sm:[&_[data-slot=input]]:text-6xl"
														/>
													</div>
													{isInvalid && errorMessage ? (
														<FieldError match className="mt-3 text-xs text-warning-foreground">
															{errorMessage}
														</FieldError>
													) : null}
												</Field>
											);
										}}
									</form.Field>

									<Button
										type="submit"
										variant="default"
										size="xl"
										className="mt-10 rounded-full px-8"
										loading={group.state.meta.isSubmitting}
									>
										Continuar
									</Button>
								</form>
							)}
						</form.FormGroup>
					</>
				)}

				{step === "split" && (
					<>
						<h1 className="mt-9 text-4xl font-normal leading-tight tracking-tight sm:text-5xl">
							Así se reparte
						</h1>
						<form.FormGroup
							name="splitStep"
							validators={{ onDynamic: splitStepSchema }}
							onGroupSubmit={() => {
								setStep("fixed");
							}}
						>
							{(group) => (
								<form noValidate className="mt-8" onSubmit={submitWith(() => group.handleSubmit())}>
									<form.Field name="splitStep.split">
										{(splitField) => {
											const isInvalid = !splitField.state.meta.isValid;
											const errorMessage = splitField.state.meta.errors[0];
											return (
												<>
													<div className="border-t border-border">
														{ENVELOPES.map((envelope) => (
															<form.Field
																key={envelope.key}
																name={`splitStep.split.${envelope.key}`}
															>
																{(field) => (
																	<Field
																		name={field.name}
																		invalid={isInvalid}
																		className="border-b border-border py-5"
																	>
																		<div className="flex w-full items-center gap-3">
																			<span
																				aria-hidden="true"
																				className={cn("size-2 shrink-0 rounded-full", envelope.dot)}
																			/>
																			<span className="flex-1 text-base">{envelope.label}</span>
																			<Input
																				name={field.name}
																				type="number"
																				inputMode="decimal"
																				min={0}
																				max={100}
																				aria-label={`Porcentaje de ${envelope.label}`}
																				value={field.state.value}
																				onBlur={field.handleBlur}
																				onChange={(e) =>
																					field.handleChange(
																						e.target.value === "" ? 0 : Number(e.target.value),
																					)
																				}
																				unstyled
																				className="w-14 border-0 border-b border-neutral-400 bg-transparent has-focus-visible:border-foreground has-aria-invalid:border-amber-500 [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-1 [&_[data-slot=input]]:text-right [&_[data-slot=input]]:tabular-nums"
																			/>
																			<span className="text-sm text-muted-foreground">%</span>
																			<span className="w-28 text-right text-sm tabular-nums text-muted-foreground">
																				S/{" "}
																				{formatCents(
																					Math.round((incomeCents * field.state.value) / 100),
																				)}
																			</span>
																		</div>
																		<div className="mt-4 h-1 w-full rounded-full bg-muted">
																			<div
																				className={cn("h-1 rounded-full", envelope.dot)}
																				style={{
																					width: `${Math.min(100, Math.max(0, field.state.value))}%`,
																				}}
																			/>
																		</div>
																	</Field>
																)}
															</form.Field>
														))}
													</div>
													{isInvalid && errorMessage ? (
														<Field name={splitField.name} invalid>
															<FieldError match className="mt-3 text-xs text-warning-foreground">
																{errorMessage}
															</FieldError>
														</Field>
													) : null}
												</>
											);
										}}
									</form.Field>
									<p className="mt-5 text-xs text-muted-foreground">
										Puedes cambiarlo cuando quieras en tus sobres.
									</p>
									<Button
										type="submit"
										variant="default"
										size="xl"
										className="mt-10 rounded-full px-8"
										loading={group.state.meta.isSubmitting}
									>
										Continuar
									</Button>
								</form>
							)}
						</form.FormGroup>
					</>
				)}

				{step === "fixed" && (
					<>
						<h1 className="mt-9 text-4xl font-normal leading-tight tracking-tight sm:text-5xl">
							Tu número
						</h1>
						<form.FormGroup
							name="fixedStep"
							validators={{ onDynamic: createFixedStepSchema(incomeCents) }}
							onGroupSubmit={async () => {
								setSaveError(null);
								const { cycleStep, splitStep } = form.state.values;
								try {
									await completeOnboarding({
										cadence: cycleStep.cadence,
										cycleStartDay:
											cycleStep.startDay === "last" ? "last" : Number(cycleStep.startDay),
										incomeCents: toCents(cycleStep.amount),
										split: splitStep.split,
									});
									await navigate({ to: "/home", replace: true });
								} catch (error) {
									setSaveError(
										error instanceof ConvexError
											? String(error.data)
											: "No pudimos guardar. Inténtalo otra vez.",
									);
								}
							}}
						>
							{(group) => (
								<form noValidate className="mt-8" onSubmit={submitWith(() => group.handleSubmit())}>
									<p className="text-xs text-muted-foreground">Puedes gastar hoy</p>
									<p className="mt-3 flex items-baseline gap-3">
										<span className="text-2xl text-muted-foreground">S/</span>
										<span className="text-5xl leading-tight tabular-nums sm:text-6xl">
											{formatCents(preview.dailyCents)}
										</span>
									</p>
									<div className="mt-6 flex flex-col gap-1 text-xs tabular-nums text-muted-foreground">
										<p>
											Ingreso S/ {formatCents(incomeCents)}
											{commitmentsCents > 0
												? ` · Compromisos S/ ${formatCents(commitmentsCents)}`
												: null}
										</p>
										<p>
											Necesidades S/ {formatCents(preview.needs)} · Gustos S/{" "}
											{formatCents(preview.wants)} · Ahorro S/ {formatCents(preview.savings)}
										</p>
									</div>
									<Button
										type="button"
										variant="default"
										size="xl"
										className="mt-8 h-12 rounded-full px-8"
										loading={group.state.meta.isSubmitting}
										onClick={() => void group.handleSubmit()}
									>
										Empezar mi ciclo
									</Button>

									{saveError ? (
										<p role="alert" className="mt-3 text-xs text-warning-foreground">
											{saveError}
										</p>
									) : null}

									<form.Field name="fixedStep.commitments" mode="array">
										{(field) => {
											const isInvalid = !field.state.meta.isValid;
											const errorMessage = field.state.meta.errors[0];
											return (
												<>
													<Collapsible className="mt-10 border-t border-border pt-5">
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
																		!field.state.value.some(
																			(commitment) => commitment.kind === option.kind,
																		),
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
																			<form.Field name={`fixedStep.commitments[${index}].name`}>
																				{(nameField) => (
																					<Input
																						name={nameField.name}
																						aria-label="Nombre del compromiso"
																						placeholder="Nombre"
																						value={nameField.state.value}
																						onBlur={nameField.handleBlur}
																						onChange={(e) => nameField.handleChange(e.target.value)}
																						unstyled
																						className="flex-1 border-0 border-b border-neutral-400 bg-transparent has-focus-visible:border-foreground [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-1 [&_[data-slot=input]]:text-sm"
																					/>
																				)}
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
																		<form.Field name={`fixedStep.commitments[${index}].amount`}>
																			{(amountField) => (
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
																						onChange={(e) =>
																							amountField.handleChange(e.target.value)
																						}
																						unstyled
																						className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-1 [&_[data-slot=input]]:text-sm [&_[data-slot=input]]:tabular-nums"
																					/>
																				</div>
																			)}
																		</form.Field>
																		<form.Field name={`fixedStep.commitments[${index}].day`}>
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
							)}
						</form.FormGroup>
					</>
				)}
			</main>
		</div>
	);
}
