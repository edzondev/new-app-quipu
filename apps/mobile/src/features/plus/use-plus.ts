import { SAMPLE_PROFILE } from "@/features/settings/sample";
import { SAMPLE_OFFERS, SAMPLE_TRIAL_ENDS_AT } from "./sample";

export function usePlus() {
	return {
		offers: SAMPLE_OFFERS,
		hasPlus: SAMPLE_PROFILE.hasPlus,
		trialAvailable: SAMPLE_PROFILE.plusHistory === "none",
		startTrial: () => SAMPLE_TRIAL_ENDS_AT,
	};
}
