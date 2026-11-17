import { createContext, type ReactNode, use, useState } from "react";
import { SAMPLE_HOUSEHOLD } from "@/features/settings/sample";

type Space = "personal" | "household";

type SpaceState = {
	space: Space;
	setSpace: (space: Space) => void;
	/** Nuestro espacio without Plus can be read but not written (K4a). */
	readOnly: boolean;
};

const SpaceContext = createContext<SpaceState | null>(null);

/** Which space Inicio shows. Al conectar Convex, `readOnly` sale de `household.get().plus.active`. */
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
