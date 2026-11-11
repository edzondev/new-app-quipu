import { useConvexAction } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useRouterState } from "@tanstack/react-router";
import { useOpenUrl } from "./use-open-url";

/** Polar's customer portal, coming back to the page it was opened from. */
export function usePortal() {
	const returnTo = useRouterState({ select: (state) => state.location.href });
	const openPortal = useConvexAction(api.billing.openPortal);
	return useOpenUrl(() => openPortal({ returnTo }));
}
