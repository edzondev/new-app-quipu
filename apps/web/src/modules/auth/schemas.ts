import * as z from "zod/mini";

const emailSchema = z
	.string()
	.check(
		z.trim(),
		z.minLength(1, "Escribe tu correo."),
		z.regex(z.regexes.email, "Correo inválido."),
	);

export const emailStepSchema = z.object({
	email: emailSchema,
});

export const otpStepSchema = z.object({
	otp: z.string().check(z.regex(/^\d{6}$/, "El código tiene 6 dígitos.")),
});
