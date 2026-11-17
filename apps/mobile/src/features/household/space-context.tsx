import { createContext, type ReactNode, use, useState } from "react";
import { SAMPLE_HOUSEHOLD } from "@/features/settings/sample";

type Space = "personal" | "household";

type SpaceState = {
	space: Space;
	setSpace: (space: Space) => void;
	readOnly: boolean;
};

const SpaceContext = createContext<SpaceState | null>(null);

export function SpaceProvider({ children }: { children: ReactNode }) {
	const [space, setSpace] = useState<Space>("personal");
	const readOnly = space === "household" && !SAMPLE_HOUSEHOLD.plus.active;

	return <SpaceContext value={{ space, setSpace, readOnly }}>{children}</SpaceContext>;
}

export function useSpace() {
	const state = use(SpaceContext);
	if (!state) throw new Error("useSpace needs a SpaceProvider above it.");
	return state;
}
