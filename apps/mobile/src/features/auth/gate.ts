import { api } from "@quipu/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";

export type Gate = "loading" | "signed-out" | "onboarding" | "app";

// Same rules as apps/web/src/routes/_app.tsx, minus deletionRunsAt (no mobile screen for it yet).
export function useGate(): Gate {
	const { isLoading, isAuthenticated } = useConvexAuth();
	const profile = useQuery(api.profiles.myProfile, isAuthenticated ? {} : "skip");

	if (isLoading) return "loading";
	if (!isAuthenticated) return "signed-out";
	if (profile === undefined) return "loading";
	if (profile === null || (!profile.plan && !profile.hasHousehold)) return "onboarding";
	return "app";
}
