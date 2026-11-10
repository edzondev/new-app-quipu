import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient, sendSignInCode } from "#/lib/auth-client";
import { getAuthErrorMessage } from "#/lib/auth-errors";
import { clearAuthTokenCache } from "#/lib/auth-token";
import { emailStepSchema } from "#/modules/auth/schemas";

type Props = {
	/** Where a passkey sign-in goes. */
	redirect: string;
	defaultEmail: string;
	onSent: (email: string) => void;
};

export function EmailStep({ redirect, defaultEmail, onSent }: Props) {
	const queryClient = useQueryClient();
	const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
	const [error, setError] = useState<string | null>(null);
	const [isPasskeyPending, setIsPasskeyPending] = useState(false);
	const [hasPasskeySession, setHasPasskeySession] = useState(false);
	const isSigningIn = isPasskeyPending || hasPasskeySession;

	// Passkey autofill: the browser offers saved passkeys in the email field's suggestions.
	// Errors are ignored on purpose (unsupported browser, or aborted when the button starts its own request).
	useEffect(() => {
		void authClient.signIn
			.passkey({ autoFill: true })
			.then(({ data }) => {
				if (!data) return;
				clearAuthTokenCache(queryClient);
				setHasPasskeySession(true);
			})
			.catch(() => {});
	}, [queryClient]);

	async function signInWithPasskey() {
		setError(null);
		setIsPasskeyPending(true);
		const { error } = await authClient.signIn.passkey();
		if (error) {
			setIsPasskeyPending(false);
			setError("No se pudo entrar con huella o rostro. Entra con tu correo.");
			return;
		}
		clearAuthTokenCache(queryClient);
		setHasPasskeySession(true);
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

	// Navigate only once Convex confirms the session: before that myProfile runs without a token,
	// returns null and /_app sends the user to /onboarding.
	if (hasPasskeySession && isConvexAuthenticated) return <Navigate to={redirect} />;

	return (
		<>
			<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
				Entrar a Quipu
			</h1>
			<form
				noValidate
				className="mt-9"
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
									Correo
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
					disabled={isSubmitting || isSigningIn}
					loading={isSubmitting}
				>
					Enviar código
				</Button>
			</form>
			<div className="my-7 flex items-center gap-4 text-xs text-muted-foreground">
				<span className="h-px flex-1 bg-border" />
				<span>o</span>
				<span className="h-px flex-1 bg-border" />
			</div>
			<Button
				type="button"
				variant="outline"
				size="xl"
				className="w-full rounded-full"
				disabled={isSigningIn || isSubmitting}
				loading={isSigningIn}
				onClick={signInWithPasskey}
			>
				<Fingerprint strokeWidth={1.5} />
				Entrar con huella o rostro
			</Button>
			<p className="mt-4 text-xs leading-relaxed text-muted-foreground">
				Usa el desbloqueo de tu celular o compu.
			</p>
		</>
	);
}
