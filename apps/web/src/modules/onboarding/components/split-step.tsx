import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { AMOUNT_KEYS, formatCents, splitIncome, toCents } from "@quipu/backend/shared/budget";
import { parseStartDay } from "@quipu/backend/shared/plan";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import {
	type CycleStepValues,
	type SplitStepValues,
	splitStepSchema,
} from "#/modules/onboarding/schemas";

const ENVELOPES = [
	{ key: "needs", label: "Necesidades", dot: "bg-sky-800" },
	{ key: "wants", label: "Gustos", dot: "bg-orange-600" },
	{ key: "savings", label: "Ahorro", dot: "bg-teal-700" },
] as const;

type Props = {
	defaultValues: SplitStepValues;
	cycleStep: CycleStepValues;
	/** Back keeps what was typed, even if it doesn't add up to 100 yet. */
	onBack: (value: SplitStepValues) => void;
};

export function SplitStep({ defaultValues, cycleStep, onBack }: Props) {
	const navigate = useNavigate();
	const completeOnboarding = useConvexMutation(api.profiles.completeOnboarding);
	const [saveError, setSaveError] = useState<string | null>(null);
	const todayCents = toCents(cycleStep.todayAmount);
	const cycleIncomeCents = toCents(cycleStep.cycleIncome);

	const form = useForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: splitStepSchema },
		onSubmit: async ({ value }) => {
			setSaveError(null);
			try {
				await completeOnboarding({
					cadence: cycleStep.cadence,
					cycleStartDay: parseStartDay(cycleStep.startDay),
					incomeCents: cycleIncomeCents,
					todayCents,
					split: value.split,
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

	return (
		<>
			<StepHeader title="Así se reparte" onBack={() => onBack(form.state.values)} />
			<form
				noValidate
				className="mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<form.Field name="split">
					{(splitField) => {
						const isInvalid = !splitField.state.meta.isValid;
						const errorMessage = splitField.state.meta.errors[0]?.message;
						const shares = splitIncome(todayCents, splitField.state.value);
						return (
							<>
								<div className="border-t border-border">
									{ENVELOPES.map((envelope) => (
										<form.Field key={envelope.key} name={`split.${envelope.key}`}>
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
															S/ {formatCents(shares[AMOUNT_KEYS[envelope.key]])}
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
				{saveError ? (
					<p role="alert" className="mt-3 text-xs text-warning-foreground">
						{saveError}
					</p>
				) : null}
				<Button
					type="submit"
					variant="default"
					size="xl"
					disabled={isSubmitting}
					className="mt-10 rounded-full px-8"
				>
					{isSubmitting ? "Guardando…" : "Empezar"}
				</Button>
			</form>
		</>
	);
}
