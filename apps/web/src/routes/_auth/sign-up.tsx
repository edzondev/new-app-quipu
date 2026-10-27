import { revalidateLogic, useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { detailsStepSchema, otpStepSchema, signUpFormSchema } from "#/lib/auth-schemas";

export const Route = createFileRoute("/_auth/sign-up")({
	component: SignUpPage,
});

type Step = "details" | "otp" | "passkey";

function toOtpDigits(raw: string): string {
	return raw.replace(/\D/g, "").slice(0, 6);
}

function SignUpPage() {
	const navigate = useNavigate();
	const [step, setStep] = useState<Step>("details");

	const form = useForm({
		defaultValues: {
			detailsStep: { name: "", email: "" },
			otpStep: { otp: "" },
		},
		validationLogic: revalidateLogic(),
		validators: {
			onDynamic: signUpFormSchema,
		},
	});

	return (
		<main className="mx-auto w-full max-w-124 px-7 pb-16 pt-6 sm:pt-10">
			<Button
				variant="ghost"
				className="mb-9 h-8 gap-2 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
				render={<Link to="/" />}
			>
				<ArrowLeft strokeWidth={1.5} />
				Volver
			</Button>

			{step === "details" && (
				<>
					<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
						Empecemos por lo básico.
					</h1>
					<form.FormGroup
						name="detailsStep"
						validators={{ onDynamic: detailsStepSchema }}
						onGroupSubmit={({ value }) => {
							// Better Auth: authClient.emailOtp.sendVerificationOtp({ email: value.email, type: "sign-in" })
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
								className="mt-10 flex flex-col gap-6"
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									void group.handleSubmit();
								}}
							>
								<form.Field name="detailsStep.name">
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
								<form.Field name="detailsStep.email">
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
								<Button
									type="submit"
									variant="default"
									size="xl"
									className="mt-9 w-full rounded-full"
									disabled={group.state.meta.isSubmitting}
									loading={group.state.meta.isSubmitting}
								>
									Enviarme el código
								</Button>
							</form>
						)}
					</form.FormGroup>
				</>
			)}

			{step === "otp" && (
				<>
					<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
						Revisa tu correo
					</h1>
					<p className="mt-6 wrap-break-word text-sm leading-relaxed text-muted-foreground">
						Te mandamos un código de 6 dígitos a {form.getFieldValue("detailsStep.email")}.
					</p>
					<form.FormGroup
						name="otpStep"
						validators={{ onDynamic: otpStepSchema }}
						onGroupSubmit={({ value }) => {
							// Better Auth: authClient.signIn.emailOtp({ email: form.getFieldValue("detailsStep.email"), otp: value.otp, name: form.getFieldValue("detailsStep.name") })
							authClient.signIn.emailOtp({
								email: form.getFieldValue("detailsStep.email"),
								otp: value.otp,
								name: form.getFieldValue("detailsStep.name"),
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
												email: form.getFieldValue("detailsStep.email"),
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
							setStep("details");
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
					<p className="mt-6 wrap-break-word text-sm leading-relaxed text-muted-foreground">
						Crea una llave en este equipo y entra con tu huella o tu cara.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Button
							type="button"
							variant="secondary"
							className="h-12 flex-1 rounded-full px-4"
							onClick={() => {
								// Better Auth: authClient.passkey.addPasskey()
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
