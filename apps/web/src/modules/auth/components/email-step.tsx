import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient, sendSignInCode } from "#/lib/auth-client";
import { getAuthErrorMessage } from "#/lib/auth-errors";
import { emailStepSchema } from "#/modules/auth/schemas";

type Props = {
	defaultEmail: string;
	onSent: (email: string) => void;
};

export function EmailStep({ defaultEmail, onSent }: Props) {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [isPasskeyPending, setIsPasskeyPending] = useState(false);

	// Passkey autofill: the browser offers saved passkeys in the email field's suggestions.
	// Errors are ignored on purpose (unsupported browser, or aborted when the button starts its own request).
	useEffect(() => {
		void authClient.signIn
			.passkey({ autoFill: true })
			.then(({ data }) => data && navigate({ to: "/home" }))
			.catch(() => {});
	}, [navigate]);

	async function signInWithPasskey() {
		setError(null);
		setIsPasskeyPending(true);
		const { error } = await authClient.signIn.passkey();
		setIsPasskeyPending(false);
		if (error) {
			setError("No pudimos usar tu llave. Si no tienes una en este equipo, entra con tu correo.");
			return;
		}
		await navigate({ to: "/home" });
	}

	const form = useForm({
		defaultValues: { email: defaultEmail },
		validationLogic: revalidateLogic(),
		validators: { onDynamic: emailStepSchema },
		onSubmit: async ({ value }) => {
			setError(null);
			const email = value.email.trim();
			const { error } = await sendSignInCode(email);
			if (error) {
				setError(getAuthErrorMessage(error));
				return;
			}
			onSent(email);
		},
	});
	const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

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
				disabled={isPasskeyPending || isSubmitting}
				loading={isPasskeyPending}
				onClick={signInWithPasskey}
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
									autoComplete="username webauthn"
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
					<p role="alert" className="mt-3 text-xs text-warning-foreground">
						{error}
					</p>
				) : null}
				<Button
					type="submit"
					variant="default"
					size="xl"
					className="mt-9 w-full rounded-full"
					disabled={isSubmitting || isPasskeyPending}
					loading={isSubmitting}
				>
					Recibir código por correo
				</Button>
			</form>
			<p className="mt-6 text-xs leading-relaxed text-muted-foreground">
				¿Cambiaste de celular o perdiste tu llave? Entra con un código y crea una nueva.
			</p>
		</>
	);
}
