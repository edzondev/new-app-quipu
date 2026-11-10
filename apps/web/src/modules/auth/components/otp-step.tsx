import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { useCountdown } from "#/hooks/use-countdown";
import { authClient, sendSignInCode } from "#/lib/auth-client";
import { type AuthError, getAuthErrorMessage } from "#/lib/auth-errors";
import { clearAuthTokenCache } from "#/lib/auth-token";
import { otpStepSchema } from "#/modules/auth/schemas";

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
	const queryClient = useQueryClient();
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
			clearAuthTokenCache(queryClient);
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
			<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
				Revisa tu correo
			</h1>
			<p className="mt-6 wrap-break-word text-sm leading-relaxed text-muted-foreground">
				<span className="break-all font-medium text-foreground">{email}</span>{" "}
				<Button
					type="button"
					variant="ghost"
					className="inline h-auto p-0 text-sm text-muted-foreground underline underline-offset-4 hover:bg-transparent hover:text-foreground"
					onClick={onChangeEmail}
				>
					Cambiar
				</Button>
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
									className="w-full border-0 border-b border-input bg-transparent has-focus-visible:border-foreground has-aria-invalid:border-warning [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-3.5 [&_[data-slot=input]]:text-center [&_[data-slot=input]]:font-mono [&_[data-slot=input]]:text-2xl [&_[data-slot=input]]:tracking-widest"
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
						{getAuthErrorMessage(error)}
					</p>
				) : null}
				<p className="mt-4 text-xs text-muted-foreground">Vence en 5 minutos.</p>
				<div className="mt-2">
					<Button
						type="button"
						variant="ghost"
						className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
						disabled={secondsLeft > 0 || isResending}
						onClick={resend}
					>
						{secondsLeft > 0 ? `Reenviar en ${formatClock(secondsLeft)}` : "Reenviar código"}
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
					Entrar
				</Button>
			</form>
		</>
	);
}
