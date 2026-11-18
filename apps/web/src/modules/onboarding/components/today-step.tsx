import { Button } from "#/components/ui/button";
import { withForm } from "#/hooks/use-app-form";
import { MoneyField } from "#/modules/onboarding/components/cycle-fields";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import { emptyValues } from "#/modules/onboarding/default-values";

export const TodayStep = withForm({
	defaultValues: emptyValues,
	props: { onBack: () => {}, onSubmit: () => {} },
	render: ({ form, onBack, onSubmit }) => (
		<>
			<StepHeader title="¿Cuánto tienes hoy?" onBack={onBack} />
			<form
				noValidate
				className="mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					onSubmit();
				}}
			>
				<form.Field name="todayStep.todayAmount">
					{(field) => (
						<MoneyField field={field} ariaLabel="Cuánto tienes hoy" size="lg" className="mt-12" />
					)}
				</form.Field>
				<Button type="submit" variant="default" size="xl" className="mt-10 rounded-full px-8">
					Continuar
				</Button>
			</form>
		</>
	),
});
