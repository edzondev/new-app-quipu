import * as z from "zod/mini";
import { getCommitmentsCents, toCents } from "#/modules/onboarding/preview";

export const cadenceSchema = z.enum(["monthly", "biweekly", "weekly"]);

export const commitmentKindSchema = z.enum(["rent", "phone", "internet", "utilities", "other"]);

const positiveMoney = (message: string) =>
	z.string().check(z.refine((v) => toCents(v) > 0, message));

export const amountSchema = positiveMoney("Escribe con cuánto cuentas.");

export const cycleStepSchema = z.object({
	cadence: cadenceSchema,
	startDay: z.string(),
	amount: amountSchema,
});

export const splitSchema = z
	.object({
		needs: z.number(),
		wants: z.number(),
		savings: z.number(),
	})
	.check(
		z.refine((split) => {
			const values = [split.needs, split.wants, split.savings];
			const isInRange = values.every((value) => value >= 0 && value <= 100);
			const total = values.reduce((sum, value) => sum + value, 0);
			return isInRange && Math.round(total * 100) === 10000;
		}, "La distribución debe sumar 100%."),
	);

export const splitStepSchema = z.object({
	split: splitSchema,
});

export const commitmentSchema = z.object({
	kind: commitmentKindSchema,
	name: z.string().check(z.refine((v) => v.trim().length > 0, "Escribe el nombre del compromiso.")),
	amount: positiveMoney("Escribe el monto o quita ese compromiso."),
	day: z.string(),
});

export const commitmentsSchema = z.array(commitmentSchema);

export const fixedStepSchema = z.object({
	commitments: commitmentsSchema,
});

export function createFixedStepSchema(incomeCents: number) {
	return z.object({
		commitments: commitmentsSchema.check(
			z.refine(
				(commitments) => getCommitmentsCents(commitments) <= incomeCents,
				"Los compromisos superan tu ingreso.",
			),
		),
	});
}

export const onboardingFormSchema = z.object({
	cycleStep: cycleStepSchema,
	splitStep: splitStepSchema,
	fixedStep: fixedStepSchema,
});

export type Cadence = z.infer<typeof cadenceSchema>;
export type CommitmentKind = z.infer<typeof commitmentKindSchema>;
export type Commitment = z.infer<typeof commitmentSchema>;
export type Split = z.infer<typeof splitSchema>;
export type OnboardingValues = z.infer<typeof onboardingFormSchema>;
