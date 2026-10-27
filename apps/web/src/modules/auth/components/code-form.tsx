import { useForm } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { codeFormSchema } from "#/lib/auth-schemas";

function toCodeDigits(raw: string): string {
	return raw.replace(/\D/g, "").slice(0, 6);
}

export function CodeForm({
	email,
	onSubmit,
	onResend,
	onChangeEmail,
}: {
	email: string;
	onSubmit: (values: { code: string }) => void;
	onResend: () => void;
	onChangeEmail: () => void;
}) {
	const form = useForm({
		defaultValues: { code: "" },
		validators: { onSubmit: codeFormSchema },
		onSubmit: ({ value }) => {
			onSubmit({ code: value.code });
		},
	});

	return (
		<>
			<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
				Revisa tu correo
			</h1>
			<p className="mt-6 wrap-break-words text-sm leading-relaxed text-muted-foreground">
				Te mandamos un código de 6 dígitos a {email}.
			</p>
			<form
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="code">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						const errorMessage = field.state.meta.errors[0]?.message;
						return (
							<Field name={field.name} invalid={isInvalid} className="mt-8">
								<FieldLabel className="sr-only">Código de 6 dígitos</FieldLabel>
								<Input
									name={field.name}
									inputMode="numeric"
									autoComplete="one-time-code"
									maxLength={6}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(toCodeDigits(e.target.value))}
									unstyled
									className="w-full border-0 border-b border-neutral-400 bg-transparent has-focus-visible:border-foreground has-aria-invalid:border-amber-500 [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-3.5 [&_[data-slot=input]]:text-center [&_[data-slot=input]]:font-mono [&_[data-slot=input]]:text-2xl [&_[data-slot=input]]:tracking-widest"
								/>
								{isInvalid && errorMessage ? (
									<FieldError match className="text-warning-foreground">
										{errorMessage}
									</FieldError>
								) : null}
								<FieldDescription className="mt-4 text-xs">
									El código dura 5 minutos.
								</FieldDescription>
							</Field>
						);
					}}
				</form.Field>
				<div className="mt-5">
					<Button
						type="button"
						variant="ghost"
						className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
						onClick={onResend}
					>
						Reenviar código
					</Button>
				</div>
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
							Confirmar
						</Button>
					)}
				</form.Subscribe>
			</form>
			<Button
				type="button"
				variant="ghost"
				className="mt-6 h-auto p-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
				onClick={onChangeEmail}
			>
				Cambiar correo
			</Button>
		</>
	);
}
