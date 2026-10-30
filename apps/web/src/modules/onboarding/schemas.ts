import { toCents } from "@quipu/backend/shared/budget";
import { isValidSplit } from "@quipu/backend/shared/plan";
import * as z from "zod/mini";

export const cadenceSchema = z.enum(["monthly", "biweekly", "weekly"]);

const positiveMoney = (message: string) =>
	z.string().check(z.refine((v) => toCents(v) > 0, message));

export const cycleStepSchema = z.object({
	cadence: cadenceSchema,
	startDay: z.string(),
	todayAmount: positiveMoney("Escribe cuánto tienes hoy."),
	cycleIncome: positiveMoney("Escribe cuánto ganas por ciclo."),
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

export type Cadence = z.infer<typeof cadenceSchema>;
export type Split = z.infer<typeof splitSchema>;
export type CycleStepValues = z.infer<typeof cycleStepSchema>;
export type SplitStepValues = z.infer<typeof splitStepSchema>;
export type OnboardingValues = {
	cycleStep: CycleStepValues;
	splitStep: SplitStepValues;
};
