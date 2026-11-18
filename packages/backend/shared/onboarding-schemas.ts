import { toCents } from "@quipu/backend/shared/budget";
import { nameSchema } from "@quipu/backend/shared/name";
import { isValidSplit, isValidStartDay, parseStartDay } from "@quipu/backend/shared/plan";
import { FREQUENCIES, isFrequency } from "@quipu/backend/shared/start-day";
import * as z from "zod/mini";

// Optional: empty is fine, anything typed must be a positive amount.
const optionalPositiveMoney = (message: string) =>
	z.string().check(z.refine((v) => v.trim() === "" || toCents(v) > 0, message));

// Empty or invalid strings become 0 via toCents; require a typed non-negative amount.
const nonNegativeMoney = (message: string) =>
	z.string().check(
		z.refine((v) => {
			const n = Number(v.replace(/,/g, ""));
			return v.trim() !== "" && Number.isFinite(n) && n >= 0;
		}, message),
	);

export const nameStepSchema = z.object({ name: nameSchema });

// "" is the frequency nobody has picked yet: the step does not advance until there is one.
export const cycleStepSchema = z
	.object({
		frequency: z.enum(["", ...FREQUENCIES]).check(z.refine(isFrequency)),
		startDay: z.string(),
		cycleIncome: optionalPositiveMoney("Escribe cuánto te pagan normalmente o déjalo vacío."),
	})
	.check(
		z.refine(
			({ frequency, startDay }) =>
				!isFrequency(frequency) ||
				frequency === "variable" ||
				isValidStartDay(frequency, parseStartDay(startDay)),
			{ path: ["startDay"] },
		),
	);

export const todayStepSchema = z.object({
	todayAmount: nonNegativeMoney("Escribe cuánto tienes hoy."),
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

export type NameStepValues = z.infer<typeof nameStepSchema>;
export type CycleStepValues = z.infer<typeof cycleStepSchema>;
export type TodayStepValues = z.infer<typeof todayStepSchema>;
export type SplitStepValues = z.infer<typeof splitStepSchema>;
export type OnboardingValues = {
	nameStep: NameStepValues;
	cycleStep: CycleStepValues;
	todayStep: TodayStepValues;
	splitStep: SplitStepValues;
};
