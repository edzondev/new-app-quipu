import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { PlusFeature } from "./features";
import { OfferView } from "./offer-view";
import { PlansView } from "./plans-view";
import { usePlus } from "./use-plus";

// The sheet unmounts its content when it closes, so each opening starts from the first view.
// Another sheet can show it in place of its own content (the goal form), so two sheets never stack.
export function PlusContent({
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
