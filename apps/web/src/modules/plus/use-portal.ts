import { useConvexAction } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";

/** Polar's customer portal, coming back to the page it was opened from. */
export function usePortal() {
	const returnTo = useRouterState({ select: (state) => state.location.href });
	const openPortal = useConvexAction(api.billing.openPortal);
	const portal = useMutation({
		mutationFn: () => openPortal({ returnTo }),
		onSuccess: ({ url }) => window.location.assign(url),
	});
	return { open: () => portal.mutate(), opening: portal.isPending, failed: portal.isError };
}
