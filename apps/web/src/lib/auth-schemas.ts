import * as z from "zod/mini";

export const nameSchema = z.string().check(z.trim(), z.minLength(1, "Escribe tu nombre."));

export const emailSchema = z
	.string()
	.check(
		z.trim(),
		z.minLength(1, "Escribe tu correo."),
		z.regex(z.regexes.email, "Revisa tu correo."),
	);

export const otpSchema = z.string().check(z.regex(/^\d{6}$/, "El código tiene 6 dígitos."));

export const emailStepSchema = z.object({
	email: emailSchema,
});

export const detailsStepSchema = z.object({
	name: nameSchema,
	email: emailSchema,
});

export const otpStepSchema = z.object({
	otp: otpSchema,
});

export const signInFormSchema = z.object({
	emailStep: emailStepSchema,
	otpStep: otpStepSchema,
});

export const signUpFormSchema = z.object({
	detailsStep: detailsStepSchema,
	otpStep: otpStepSchema,
});
