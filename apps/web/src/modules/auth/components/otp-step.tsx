import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { useCountdown } from "#/hooks/use-countdown";
import { authClient, sendSignInCode } from "#/lib/auth-client";
import { type AuthError, getAuthErrorMessage } from "#/lib/auth-errors";
import { otpStepSchema } from "#/modules/auth/schemas";

type Props = {
	email: string;
	/** Only sign-up sends a name; without it the server refuses to create a new account. */
	name?: string;
	onChangeEmail: () => void;
	onVerified: () => void;
};

function toOtpDigits(raw: string): string {
	return raw.replace(/\D/g, "").slice(0, 6);
}

export function OtpStep({ email, name, onChangeEmail, onVerified }: Props) {
	const [error, setError] = useState<AuthError>(null);
	const [isResending, setIsResending] = useState(false);
	const { secondsLeft, restart } = useCountdown();

	const form = useForm({
		defaultValues: { otp: "" },
		validationLogic: revalidateLogic(),
		validators: { onDynamic: otpStepSchema },
		onSubmit: async ({ value }) => {
			setError(null);
			const { error } = await authClient.signIn.emailOtp({ email, otp: value.otp, name });
			if (error) {
				setError(error);
				return;
			}
			onVerified();
		},
	});
	const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

	async function resend() {
		setError(null);
		setIsResending(true);
		const { error } = await sendSignInCode(email);
		setIsResending(false);
		if (error) {
			setError(error);
			return;
		}
		form.setFieldValue("otp", "");
		restart();
	}

	return (
		<>
			<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
				Revisa tu correo
			</h1>
			<p className="mt-6 wrap-break-word text-sm leading-relaxed text-muted-foreground">
				Te mandamos un código de 6 dígitos a {email}.
			</p>
			<form
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<form.Field name="otp">
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
									onChange={(e) => field.handleChange(toOtpDigits(e.target.value))}
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
				{error ? (
					<p role="alert" className="mt-3 text-xs text-warning-foreground">
						{getAuthErrorMessage(error)}{" "}
						{error.code === "USER_NOT_FOUND" ? (
							<Link to="/sign-up" search={{ email }} className="underline underline-offset-4">
								Crear mi cuenta
							</Link>
						) : null}
					</p>
				) : null}
				<div className="mt-5">
					<Button
						type="button"
						variant="ghost"
						className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
						disabled={secondsLeft > 0 || isResending}
						onClick={resend}
					>
						{secondsLeft > 0 ? `Reenviar en ${secondsLeft} s` : "Reenviar código"}
					</Button>
				</div>
				<Button
					type="submit"
					variant="default"
					size="xl"
					className="mt-9 w-full rounded-full"
					disabled={isSubmitting}
					loading={isSubmitting}
				>
					Confirmar
				</Button>
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
