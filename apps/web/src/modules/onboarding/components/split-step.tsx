import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { splitIncome, toCents } from "@quipu/backend/shared/budget";
import { parseStartDay } from "@quipu/backend/shared/plan";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { SplitFields } from "#/modules/onboarding/components/split-fields";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import {
	type CycleStepValues,
	type SplitStepValues,
	splitStepSchema,
} from "#/modules/onboarding/schemas";

type Props = {
	defaultValues: SplitStepValues;
	cycleStep: CycleStepValues;
	/** Where to go when the plan is saved. */
	redirect: string;
	/** Back keeps what was typed, even if it doesn't add up to 100 yet. */
	onBack: (value: SplitStepValues) => void;
};

export function SplitStep({ defaultValues, cycleStep, redirect, onBack }: Props) {
	const navigate = useNavigate();
	const completeOnboarding = useConvexMutation(api.profiles.completeOnboarding);
	const [saveError, setSaveError] = useState<string | null>(null);
	const todayCents = toCents(cycleStep.todayAmount);
	// Left empty, the usual income is omitted from the plan instead of saved as 0.
	const cycleIncomeCents = toCents(cycleStep.cycleIncome) || undefined;

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
				await navigate({ to: redirect, replace: true });
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
					{(field) => (
						<SplitFields
							value={field.state.value}
							amounts={splitIncome(todayCents, field.state.value)}
							onChange={(key, percent) => form.setFieldValue(`split.${key}`, percent)}
							error={field.state.meta.isValid ? undefined : field.state.meta.errors[0]?.message}
						>
							<p className="text-xs text-muted-foreground">
								Puedes cambiarlo cuando quieras en tus sobres.
							</p>
							{saveError ? (
								<p role="alert" className="text-xs text-warning-foreground">
									{saveError}
								</p>
							) : null}
						</SplitFields>
					)}
				</form.Field>
				<Button
					type="submit"
					variant="default"
					size="xl"
					disabled={isSubmitting}
					className="mt-6 rounded-full px-8"
				>
					{isSubmitting ? "Guardando…" : "Empezar mi ciclo"}
				</Button>
			</form>
		</>
	);
}
