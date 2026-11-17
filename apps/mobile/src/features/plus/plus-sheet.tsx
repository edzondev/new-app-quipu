import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { PlusFeature } from "./features";
import { OfferView } from "./offer-view";
import { PlansView } from "./plans-view";
import { usePlus } from "./use-plus";

// The sheet unmounts its content when it closes, so each opening starts from the first view.
function PlusContent({
	feature,
	onClose,
	onTrial,
}: {
	feature: PlusFeature | null;
	onClose: () => void;
	onTrial?: (endsAt: number) => void;
}) {
	const { trialAvailable, startTrial } = usePlus();
	const [plans, setPlans] = useState(feature === null);

	if (plans || feature === null) {
		return <PlansView highlight={feature ?? undefined} onContinue={onClose} />;
	}
	return (
		<OfferView
			feature={feature}
			trialAvailable={trialAvailable}
			onTrial={() => {
				const endsAt = startTrial();
				onClose();
				onTrial?.(endsAt);
			}}
			onPlans={() => setPlans(true)}
			onClose={onClose}
		/>
	);
}

/**
 * With a `feature`, the sheet opens as K1 or K1b (a Plus function was touched); without one, as the
 * plans (K1d). «Ver planes» swaps the content, and the touched function stays highlighted (K1e).
 * `onTrial` runs once the trial starts, to say so with a toast.
 */
export function PlusSheet({
	isPresented,
	onDismiss,
	feature = null,
	onTrial,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	feature?: PlusFeature | null;
	onTrial?: (endsAt: number) => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<PlusContent feature={feature} onClose={onDismiss} onTrial={onTrial} />
		</BottomSheet>
	);
}
