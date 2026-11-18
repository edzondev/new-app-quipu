import type { OnboardingValues } from "@quipu/backend/shared/onboarding-schemas";

export const emptyValues: OnboardingValues = {
	nameStep: { name: "" },
	cycleStep: { cadence: "monthly", startDay: "1", todayAmount: "", cycleIncome: "" },
	splitStep: { split: { needs: 50, wants: 30, savings: 20 } },
};
