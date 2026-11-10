import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import { type NameStepValues, nameStepSchema } from "#/modules/onboarding/schemas";

type Props = {
	defaultValues: NameStepValues;
	onNext: (value: NameStepValues) => void;
};

export function NameStep({ defaultValues, onNext }: Props) {
	const form = useForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: nameStepSchema },
		onSubmit: ({ value }) => onNext({ name: value.name.trim() }),
	});

	return (
		<>
			<StepHeader title="¿Cómo te llamas?" />
			<form
				noValidate
				className="mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<form.Field name="name">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						const errorMessage = field.state.meta.errors[0]?.message;
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
	);
}
