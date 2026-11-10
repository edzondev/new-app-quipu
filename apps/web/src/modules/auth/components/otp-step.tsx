import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { cn } from "cn";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { useCountdown } from "#/hooks/use-countdown";
import { authClient, sendSignInCode } from "#/lib/auth-client";
import { type AuthError, getAuthErrorMessage } from "#/lib/auth-errors";
import { otpStepSchema } from "#/modules/auth/schemas";
import { authButton, authInput, authLabel, authLink, authTitle } from "#/modules/auth/styles";

type Props = {
	email: string;
	onChangeEmail: () => void;
	onVerified: () => Promise<void>;
};

function toOtpDigits(raw: string): string {
	return raw.replace(/\D/g, "").slice(0, 6);
}

function formatClock(totalSeconds: number): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

export function OtpStep({ email, onChangeEmail, onVerified }: Props) {
	const [error, setError] = useState<AuthError>(null);
	const [isResending, setIsResending] = useState(false);
	const { secondsLeft, restart } = useCountdown();

	const form = useForm({
		defaultValues: { otp: "" },
		validationLogic: revalidateLogic(),
		validators: { onDynamic: otpStepSchema },
		onSubmit: async ({ value }) => {
			setError(null);
			const { error } = await authClient.signIn.emailOtp({ email, otp: value.otp });
			if (error) {
				setError(error);
				return;
			}
			await onVerified();
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
			<h1 className={authTitle}>Revisa tu correo</h1>
			<div className="-mt-5 mb-5 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
				<span className="wrap-anywhere">{email}</span>
				<Button
					type="button"
					variant="ghost"
					className={cn(authLink, "shrink-0 text-xs")}
					disabled={isSubmitting}
					onClick={onChangeEmail}
				>
					Cambiar
				</Button>
			</div>
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
							<Field name={field.name} invalid={isInvalid}>
								<FieldLabel className={authLabel}>Código de 6 dígitos</FieldLabel>
								<Input
									name={field.name}
									inputMode="numeric"
									autoComplete="one-time-code"
									maxLength={6}
									placeholder="000000"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(toOtpDigits(e.target.value))}
									className={cn(
										authInput,
										"[&_[data-slot=input]]:pl-6 [&_[data-slot=input]]:text-center [&_[data-slot=input]]:font-mono [&_[data-slot=input]]:text-[27px] [&_[data-slot=input]]:tracking-[0.34em]",
									)}
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
						{getAuthErrorMessage(error)}
					</p>
				) : null}
				<p className="mt-2.5 text-xs text-muted-foreground">Vence en 5 minutos.</p>
				<Button
					type="submit"
					variant="default"
					size="xl"
					className={cn(authButton, "mt-6")}
					disabled={isSubmitting}
					loading={isSubmitting}
				>
					Entrar
				</Button>
				<div className="mt-2 flex justify-center">
					<Button
						type="button"
						variant="ghost"
						className={cn(
							authLink,
							"text-xs disabled:no-underline disabled:text-muted-foreground disabled:opacity-100",
						)}
						disabled={secondsLeft > 0 || isResending || isSubmitting}
						onClick={resend}
					>
						{secondsLeft > 0 ? `Reenviar en ${formatClock(secondsLeft)}` : "Reenviar código"}
					</Button>
				</div>
			</form>
		</>
	);
}
