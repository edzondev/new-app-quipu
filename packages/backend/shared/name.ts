import * as z from "zod/mini";

export const NAME_MAX = 40;

/** The name asked in onboarding. The web form and the server check the same rule. */
export const nameSchema = z
	.string()
	.check(
		z.trim(),
		z.minLength(1, "Escribe tu nombre."),
		z.maxLength(NAME_MAX, `Máximo ${NAME_MAX} caracteres.`),
	);
