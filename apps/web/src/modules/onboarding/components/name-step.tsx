import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { withForm } from "#/hooks/use-app-form";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import { emptyValues } from "#/modules/onboarding/default-values";
import { firstErrorMessage } from "#/modules/onboarding/first-error-message";

export const NameStep = withForm({
	defaultValues: emptyValues,
	props: { onSubmit: () => {} },
	render: ({ form, onSubmit }) => (
		<>
			<StepHeader title="¿Cómo te llamas?" />
			<form
				noValidate
				className="mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					onSubmit();
				}}
			>
				<form.Field name="nameStep.name">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						const errorMessage = firstErrorMessage(field.state.meta.errors);
						return (
							<Field name={field.name} invalid={isInvalid}>
								<FieldLabel className="text-sm font-normal text-muted-foreground">
									Tu nombre
								</FieldLabel>
								<Input
									name={field.name}
									autoComplete="given-name"
									placeholder="Tu nombre"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									unstyled
									className="w-full border-0 border-b border-input bg-transparent has-focus-visible:border-foreground has-aria-invalid:border-warning [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-3.5 [&_[data-slot=input]]:text-lg"
								/>
								{isInvalid && errorMessage ? (
									<FieldError match className="text-warning-foreground">
										{errorMessage}
									</FieldError>
								) : null}
							</Field>
						);
					}}
				</form.Field>
				<Button type="submit" variant="default" size="xl" className="mt-9 w-full rounded-full">
					Continuar
				</Button>
			</form>
		</>
	),
});
