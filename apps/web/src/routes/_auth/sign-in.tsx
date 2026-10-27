import { revalidateLogic, useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { emailStepSchema, otpStepSchema, signInFormSchema } from "#/lib/auth-schemas";

export const Route = createFileRoute("/_auth/sign-in")({
	component: SignInPage,
});

type Step = "email" | "otp" | "passkey";

function toOtpDigits(raw: string): string {
	return raw.replace(/\D/g, "").slice(0, 6);
}

function SignInPage() {
	const navigate = useNavigate();
	const [step, setStep] = useState<Step>("email");

	const form = useForm({
		defaultValues: {
			emailStep: { email: "" },
			otpStep: { otp: "" },
		},
		validationLogic: revalidateLogic(),
		validators: {
			onDynamic: signInFormSchema,
		},
	});

	return (
		<main className="mx-auto w-full max-w-[496px] px-7 pb-16 pt-6 sm:pt-10">
			<Button
				variant="ghost"
				className="mb-9 h-8 gap-2 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
				render={<Link to="/" />}
			>
				<ArrowLeft strokeWidth={1.5} />
				Volver
			</Button>

			{step === "email" && (
				<>
					<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
						Qué bueno verte.
					</h1>
					<Button
						type="button"
						variant="default"
						size="xl"
						className="mt-9 w-full rounded-full"
						onClick={() => {
							authClient.signIn.passkey();
						}}
					>
						<Fingerprint strokeWidth={1.5} />
						Entrar con mi llave
					</Button>
					<div className="my-7 flex items-center gap-4 text-xs text-muted-foreground">
						<span className="h-px flex-1 bg-border" />
						<span>o</span>
						<span className="h-px flex-1 bg-border" />
					</div>
					<form.FormGroup
						name="emailStep"
						validators={{ onDynamic: emailStepSchema }}
						onGroupSubmit={({ value }) => {
							authClient.emailOtp.sendVerificationOtp({
								email: value.email,
								type: "sign-in",
							});
							setStep("otp");
						}}
					>
						{(group) => (
							<form
								noValidate
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									void group.handleSubmit();
								}}
							>
								<form.Field name="emailStep.email">
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
								<Button
									type="submit"
									variant="default"
									size="xl"
									className="mt-9 w-full rounded-full"
									disabled={group.state.meta.isSubmitting}
									loading={group.state.meta.isSubmitting}
								>
									Recibir código por correo
								</Button>
							</form>
						)}
					</form.FormGroup>
					<p className="mt-6 text-xs leading-relaxed text-muted-foreground">
						¿Cambiaste de celular o perdiste tu llave? Entra con un código y crea una nueva.
					</p>
				</>
			)}

			{step === "otp" && (
				<>
					<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
						Revisa tu correo
					</h1>
					<p className="mt-6 wrap-break-word text-sm leading-relaxed text-muted-foreground">
						Te mandamos un código de 6 dígitos a {form.getFieldValue("emailStep.email")}.
					</p>
					<form.FormGroup
						name="otpStep"
						validators={{ onDynamic: otpStepSchema }}
						onGroupSubmit={({ value }) => {
							authClient.signIn.emailOtp({
								email: form.getFieldValue("emailStep.email"),
								otp: value.otp,
							});
							setStep("passkey");
						}}
					>
						{(group) => (
							<form
								noValidate
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									void group.handleSubmit();
								}}
							>
								<form.Field name="otpStep.otp">
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
								<div className="mt-5">
									<Button
										type="button"
										variant="ghost"
										className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
										onClick={() => {
											authClient.emailOtp.sendVerificationOtp({
												email: form.getFieldValue("emailStep.email"),
												type: "sign-in",
											});
										}}
									>
										Reenviar código
									</Button>
								</div>
								<Button
									type="submit"
									variant="default"
									size="xl"
									className="mt-9 w-full rounded-full"
									disabled={group.state.meta.isSubmitting}
									loading={group.state.meta.isSubmitting}
								>
									Confirmar
								</Button>
							</form>
						)}
					</form.FormGroup>
					<Button
						type="button"
						variant="ghost"
						className="mt-6 h-auto p-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
						onClick={() => {
							form.setFieldValue("otpStep.otp", "");
							setStep("email");
						}}
					>
						Cambiar correo
					</Button>
				</>
			)}

			{step === "passkey" && (
				<>
					<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
						Entra más rápido la próxima vez
					</h1>
					<p className="mt-6 break-words text-sm leading-relaxed text-muted-foreground">
						Crea una llave en este equipo y entra con tu huella o tu cara.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Button
							type="button"
							variant="secondary"
							className="h-12 flex-1 rounded-full px-4"
							onClick={() => {
								authClient.passkey.addPasskey();
								void navigate({ to: "/home" });
							}}
						>
							<Fingerprint strokeWidth={1.5} />
							Crear mi llave
						</Button>
						<Button
							type="button"
							variant="secondary"
							className="h-12 flex-1 rounded-full px-4"
							onClick={() => {
								void navigate({ to: "/home" });
							}}
						>
							Ahora no
						</Button>
					</div>
				</>
			)}
		</main>
	);
}
