import { splitIncome, toCents } from "@quipu/backend/shared/budget";
import { useSelector } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { withForm } from "#/hooks/use-app-form";
import { SplitFields } from "#/modules/onboarding/components/split-fields";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import { emptyValues } from "#/modules/onboarding/default-values";
import { firstErrorMessage } from "#/modules/onboarding/first-error-message";

export const SplitStep = withForm({
	defaultValues: emptyValues,
	props: { saveError: null as string | null, onBack: () => {}, onSubmit: () => {} },
	render: function Render({ form, saveError, onBack, onSubmit }) {
		const todayAmount = useSelector(form.store, (state) => state.values.todayStep.todayAmount);
		const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
		const todayCents = toCents(todayAmount);

		return (
			<>
				<StepHeader title="Así se reparte" onBack={onBack} />
				<form
					noValidate
					className="mt-8"
					onSubmit={(e) => {
						e.preventDefault();
						onSubmit();
					}}
				>
					<form.Field name="splitStep.split">
						{(field) => (
							<SplitFields
								value={field.state.value}
								amounts={splitIncome(todayCents, field.state.value)}
								onChange={(key, percent) => form.setFieldValue(`splitStep.split.${key}`, percent)}
								error={
									field.state.meta.isValid ? undefined : firstErrorMessage(field.state.meta.errors)
								}
							>
								<p className="text-xs text-muted-foreground">
									Puedes cambiarlo cuando quieras en tus sobres.
								</p>
								{saveError ? (
									<p role="alert" className="wrap-break-word text-xs text-warning-foreground">
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
	},
});
