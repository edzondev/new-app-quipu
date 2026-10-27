import { useForm } from "@tanstack/react-form";
import { Fingerprint } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { emailFormSchema } from "#/lib/auth-schemas";

export function EmailForm({
	onSubmit,
	onPasskeySignIn,
}: {
	onSubmit: (values: { email: string }) => void;
	onPasskeySignIn: () => void;
}) {
	const form = useForm({
		defaultValues: { email: "" },
		validators: { onSubmit: emailFormSchema },
		onSubmit: ({ value }) => {
			onSubmit({ email: value.email.trim() });
		},
	});

	return (
		<>
			<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
				Qué bueno verte.
			</h1>
			<Button
				type="button"
				variant="default"
				size="xl"
				className="mt-9 w-full rounded-full"
				onClick={onPasskeySignIn}
			>
				<Fingerprint strokeWidth={1.5} />
				Entrar con mi llave
			</Button>
			<div className="my-7 flex items-center gap-4 text-xs text-muted-foreground">
				<span className="h-px flex-1 bg-border" />
				<span>o</span>
				<span className="h-px flex-1 bg-border" />
			</div>
			<form
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
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
							Recibir código por correo
						</Button>
					)}
				</form.Subscribe>
			</form>
			<p className="mt-6 text-xs leading-relaxed text-muted-foreground">
				¿Cambiaste de celular o perdiste tu llave? Entra con un código y crea una nueva.
			</p>
		</>
	);
}
