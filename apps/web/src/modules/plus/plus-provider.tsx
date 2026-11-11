import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useState } from "react";
import { FormSheet } from "#/components/form-sheet";
import { Dialog } from "#/components/ui/dialog";
import type { PlusFeature } from "./components/plus-features";
import { PlusOffer } from "./components/plus-offer";
import { PlusPitch } from "./components/plus-pitch";

type OpenPlus = {
	/** The Plus feature a gate asked for: shows T1 first. Without one, the plans (PW1). */
	feature?: PlusFeature;
	opener?: HTMLElement | null;
	onClose?: () => void;
};

const PlusContext = createContext<(options: OpenPlus) => void>(() => {});

export function useOpenPlus() {
	return useContext(PlusContext);
}

/** One Plus modal for the whole app: T1 and PW1 replace each other, never stack. */
export function PlusProvider({ children }: { children: ReactNode }) {
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const [request, setRequest] = useState<OpenPlus>({});
	// "closed" keeps the request, so the exit animation still shows what was open.
	const [view, setView] = useState<"pitch" | "offer" | "closed">("closed");

	const open = (next: OpenPlus) => {
		setRequest(next);
		setView(next.feature ? "pitch" : "offer");
	};
	const close = () => {
		setView("closed");
		request.onClose?.();
	};
	const onOpenChange = (isOpen: boolean) => {
		if (!isOpen) close();
	};
	const backToOpener = () => request.opener ?? true;

	return (
		<PlusContext value={open}>
			{children}
			<Dialog open={view === "pitch"} onOpenChange={onOpenChange}>
				{request.feature && profile.data ? (
					<PlusPitch
						feature={request.feature}
						plusHistory={profile.data.plusHistory}
						onPlans={() => setView("offer")}
						onDismiss={close}
						onTrialStarted={close}
						// Swapped for PW1, focus stays with PW1.
						finalFocus={() => view !== "offer" && backToOpener()}
					/>
				) : null}
			</Dialog>
			<FormSheet open={view === "offer"} onOpenChange={onOpenChange}>
				<PlusOffer highlight={request.feature} finalFocus={backToOpener} />
			</FormSheet>
		</PlusContext>
	);
}
