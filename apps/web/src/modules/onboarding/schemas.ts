import { NOTE_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { isValidSplit } from "@quipu/backend/shared/plan";
import * as z from "zod/mini";

export function toCommitmentInputs(commitments: { name: string; amount: string; day: string }[]) {
	return commitments.map(({ name, amount, day }) => ({
		name,
		amountCents: toCents(amount),
		dueDay: Number(day),
	}));
}

export function getCommitmentsCents(commitments: { amountCents: number }[]): number {
	return commitments.reduce((sum, { amountCents }) => sum + amountCents, 0);
}

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
	.check(z.refine(isValidSplit, "La distribución debe sumar 100%."));

export const splitStepSchema = z.object({
	split: splitSchema,
});

export const commitmentSchema = z.object({
	kind: commitmentKindSchema,
	name: z.string().check(
		z.refine((v) => v.trim().length > 0, "Escribe el nombre del compromiso."),
		z.refine(
			(v) => v.trim().length <= NOTE_MAX_LENGTH,
			`El nombre tiene máximo ${NOTE_MAX_LENGTH} caracteres.`,
		),
	),
	amount: positiveMoney("Escribe el monto o quita ese compromiso."),
	day: z.string(),
});

const commitmentsSchema = z.array(commitmentSchema);

export function createFixedStepSchema(incomeCents: number) {
	return z.object({
		commitments: commitmentsSchema.check(
			z.refine(
				(commitments) => getCommitmentsCents(toCommitmentInputs(commitments)) <= incomeCents,
				"Los compromisos superan tu ingreso.",
			),
		),
	});
}

export type Cadence = z.infer<typeof cadenceSchema>;
export type CommitmentKind = z.infer<typeof commitmentKindSchema>;
export type Commitment = z.infer<typeof commitmentSchema>;
export type Split = z.infer<typeof splitSchema>;
export type CycleStepValues = z.infer<typeof cycleStepSchema>;
export type SplitStepValues = z.infer<typeof splitStepSchema>;
export type FixedStepValues = z.infer<ReturnType<typeof createFixedStepSchema>>;
export type OnboardingValues = {
	cycleStep: CycleStepValues;
	splitStep: SplitStepValues;
	fixedStep: FixedStepValues;
};
