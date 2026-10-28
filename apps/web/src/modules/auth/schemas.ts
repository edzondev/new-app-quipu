import * as z from "zod/mini";

const nameSchema = z.string().check(z.trim(), z.minLength(1, "Escribe tu nombre."));

const emailSchema = z
	.string()
	.check(
		z.trim(),
		z.minLength(1, "Escribe tu correo."),
		z.regex(z.regexes.email, "Revisa tu correo."),
	);

export const emailStepSchema = z.object({
	email: emailSchema,
});

export const detailsStepSchema = z.object({
	name: nameSchema,
	email: emailSchema,
});

export const otpStepSchema = z.object({
	otp: z.string().check(z.regex(/^\d{6}$/, "El código tiene 6 dígitos.")),
});
