import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { sendSignInCode } from "#/lib/auth-client";
import { getAuthErrorMessage } from "#/lib/auth-errors";
import { detailsStepSchema } from "#/modules/auth/schemas";

type Details = { name: string; email: string };

type Props = {
	defaultValues: Details;
	onSent: (details: Details) => void;
};

export function DetailsStep({ defaultValues, onSent }: Props) {
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: detailsStepSchema },
		onSubmit: async ({ value }) => {
			setError(null);
			const details = { name: value.name.trim(), email: value.email.trim() };
			const { error } = await sendSignInCode(details.email);
			if (error) {
				setError(getAuthErrorMessage(error));
				return;
			}
			onSent(details);
		},
	});
	const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

	return (
		<>
			<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
				Empecemos por lo básico.
			</h1>
			<form
				noValidate
				className="mt-10 flex flex-col gap-6"
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
									¿Cómo te llamas?
								</FieldLabel>
								<Input
									name={field.name}
									autoComplete="given-name"
									placeholder="Tu nombre"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									unstyled
									className="w-full border-0 border-b border-neutral-400 bg-transparent has-focus-visible:border-foreground has-aria-invalid:border-amber-500 [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-3.5 [&_[data-slot=input]]:text-lg"
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
				<form.Field name="email">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						const errorMessage = field.state.meta.errors[0]?.message;
						return (
							<Field name={field.name} invalid={isInvalid}>
								<FieldLabel className="text-sm font-normal text-muted-foreground">
									Tu correo
								</FieldLabel>
								<Input
									name={field.name}
									type="email"
									autoComplete="email"
									placeholder="tu@correo.pe"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									unstyled
									className="w-full border-0 border-b border-neutral-400 bg-transparent has-focus-visible:border-foreground has-aria-invalid:border-amber-500 [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-3.5 [&_[data-slot=input]]:text-lg"
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
				{error ? (
					<p role="alert" className="text-xs text-warning-foreground">
						{error}
					</p>
				) : null}
				<p className="text-xs leading-relaxed text-muted-foreground">
					Sin contraseñas que recordar. Te mandamos un código.
				</p>
				<Button
					type="submit"
					variant="default"
					size="xl"
					className="mt-9 w-full rounded-full"
					disabled={isSubmitting}
					loading={isSubmitting}
				>
					Enviarme el código
				</Button>
			</form>
		</>
	);
}
