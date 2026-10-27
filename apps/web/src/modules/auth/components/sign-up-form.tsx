import { useForm } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { signUpFormSchema } from "#/lib/auth-schemas";

export function SignUpForm({
	onSubmit,
}: {
	onSubmit: (values: { name: string; email: string }) => void;
}) {
	const form = useForm({
		defaultValues: { name: "", email: "" },
		validators: { onSubmit: signUpFormSchema },
		onSubmit: ({ value }) => {
			onSubmit({ name: value.name.trim(), email: value.email.trim() });
		},
	});

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
					e.stopPropagation();
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
				<p className="text-xs leading-relaxed text-muted-foreground">
					Sin contraseñas que recordar. Te mandamos un código.
				</p>
				<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							variant="default"
							size="xl"
							className="mt-9 w-full rounded-full"
							disabled={!canSubmit}
							loading={isSubmitting}
						>
							Enviarme el código
						</Button>
					)}
				</form.Subscribe>
			</form>
		</>
	);
}
