import type { OnboardingValues } from "@quipu/backend/shared/onboarding-schemas";

export const emptyValues: OnboardingValues = {
	nameStep: { name: "" },
	cycleStep: { frequency: "", startDay: "1", cycleIncome: "" },
	todayStep: { todayAmount: "" },
	splitStep: { split: { needs: 50, wants: 30, savings: 20 } },
};
