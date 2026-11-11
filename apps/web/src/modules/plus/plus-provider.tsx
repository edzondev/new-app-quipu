import { createContext, type ReactNode, useContext, useState } from "react";
import { FormSheet } from "#/components/form-sheet";
import { PlusOffer } from "./components/plus-offer";
import type { PlusHighlight } from "./components/plus-features";

type OpenPlus = {
	highlight?: PlusHighlight;
	opener?: HTMLElement | null;
	onClose?: () => void;
};

const PlusContext = createContext<(options: OpenPlus) => void>(() => {});

export function useOpenPlus() {
	return useContext(PlusContext);
}

export function PlusProvider({ children }: { children: ReactNode }) {
	const [opened, setOpened] = useState<OpenPlus | null>(null);

	return (
		<PlusContext value={setOpened}>
			{children}
			<FormSheet
				open={opened !== null}
				onOpenChange={(open) => {
					if (open) return;
					setOpened(null);
					opened?.onClose?.();
				}}
			>
				<PlusOffer highlight={opened?.highlight} finalFocus={() => opened?.opener ?? true} />
			</FormSheet>
		</PlusContext>
	);
}
