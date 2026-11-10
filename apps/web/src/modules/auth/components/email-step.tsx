import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { cn } from "cn";
import { Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient, enterApp, sendSignInCode } from "#/lib/auth-client";
import { getAuthErrorMessage } from "#/lib/auth-errors";
import { emailStepSchema } from "#/modules/auth/schemas";
import { authButton, authInput, authLabel, authTitle } from "#/modules/auth/styles";

type Props = {
	/** Where a passkey sign-in goes. */
	redirect: string;
	defaultEmail: string;
	onSent: (email: string) => void;
};

export function EmailStep({ redirect, defaultEmail, onSent }: Props) {
	const [error, setError] = useState<string | null>(null);
	// Stays true after a passkey sign-in, so the buttons keep loading while the page leaves.
	const [isSigningIn, setIsSigningIn] = useState(false);

	// Passkey autofill: the browser offers saved passkeys in the email field's suggestions.
	// Errors are ignored on purpose (unsupported browser, or aborted when the button starts its own request).
	useEffect(() => {
		void authClient.signIn
			.passkey({ autoFill: true })
			.then(({ data }) => {
				if (!data) return;
				setIsSigningIn(true);
				void enterApp(redirect);
			})
			.catch(() => {});
	}, [redirect]);

	async function signInWithPasskey() {
		setError(null);
		setIsSigningIn(true);
		const { error } = await authClient.signIn.passkey();
		if (error) {
			setIsSigningIn(false);
			setError("No se pudo entrar con huella o rostro. Entra con tu correo.");
			return;
		}
		void enterApp(redirect);
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
			<h1 className={authTitle}>Entrar a Quipu</h1>
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
								<FieldLabel className={authLabel}>Correo</FieldLabel>
								<Input
									name={field.name}
									type="email"
									autoComplete="username webauthn"
									placeholder="tu@correo.com"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									className={authInput}
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
					<p role="alert" className="wrap-break-word mt-3 text-xs text-warning-foreground">
						{error}
					</p>
				) : null}
				<Button
					type="submit"
					variant="default"
					size="xl"
					className={cn(authButton, "mt-6")}
					disabled={isSubmitting || isSigningIn}
					loading={isSubmitting}
				>
					Enviar código
				</Button>
			</form>
			<div className="my-4 flex items-center gap-4 text-xs text-muted-foreground">
				<span className="h-px flex-1 bg-border" />
				<span>o</span>
				<span className="h-px flex-1 bg-border" />
			</div>
			<Button
				type="button"
				variant="outline"
				size="xl"
				className={authButton}
				disabled={isSigningIn || isSubmitting}
				loading={isSigningIn}
				onClick={signInWithPasskey}
			>
				<Fingerprint strokeWidth={1.5} />
				Entrar con huella o rostro
			</Button>
			<p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
				Usa el desbloqueo de tu celular o compu.
			</p>
		</>
	);
}
