import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Dialog } from "#/components/ui/dialog";
import { useOpenPlus } from "../plus-provider";
import { TrialEndedCard } from "./trial-ended-card";
import { WelcomeCard } from "./welcome-card";

type Profile = NonNullable<FunctionReturnType<typeof api.profiles.myProfile>>;
type Notice = "welcome" | "trialEnded";

/** What Inicio says about the plan, once each: B1 after Primeros pasos, V1 after the trial. B1 goes first. */
function pickNotice(profile: Profile): Notice | null {
	if (profile.hasPlus) return null;
	if (profile.plan !== null && !profile.welcomeSeen) return "welcome";
	if (profile.plusHistory === "trial" && !profile.trialEndedSeen) return "trialEnded";
	return null;
}

export function PlanNotice() {
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const openPlus = useOpenPlus();
	const markWelcome = useMutation({
		mutationFn: useConvexMutation(api.profiles.markWelcomeSeen),
	});
	const markTrialEnded = useMutation({
		mutationFn: useConvexMutation(api.profiles.markTrialEndedSeen),
	});
	// The closed notice stays for its exit animation, and no other one opens in the same visit to Inicio.
	const [closed, setClosed] = useState<{ notice: Notice; toPlans: boolean } | null>(null);
	const picked = profile.data ? pickNotice(profile.data) : null;
	const notice = closed?.notice ?? picked;

	const close = (toPlans: boolean) => {
		if (!notice || closed) return;
		setClosed({ notice, toPlans });
		(notice === "welcome" ? markWelcome : markTrialEnded).mutate({});
		if (toPlans) openPlus({});
	};
	// Off to PW1, focus stays with PW1.
	const finalFocus = () => !closed?.toPlans;

	return (
		<Dialog
			open={picked !== null && closed === null}
			// A click outside does not close it: only the buttons, the X or Escape.
			disablePointerDismissal
			onOpenChange={(open) => {
				if (!open) close(false);
			}}
		>
			{notice === "welcome" && profile.data ? (
				<WelcomeCard name={profile.data.name} finalFocus={finalFocus} onClose={close} />
			) : null}
			{notice === "trialEnded" && profile.data ? (
				<TrialEndedCard
					hasHousehold={profile.data.hasHousehold}
					finalFocus={finalFocus}
					onClose={close}
				/>
			) : null}
		</Dialog>
	);
}
