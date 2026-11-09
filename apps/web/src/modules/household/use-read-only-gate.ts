import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";

const NO_PLUS = "Activa Plus para seguir anotando";

/**
 * Props to spread after a button's own `onClick` when Nuestro espacio is read-only (the Plus
 * lapsed): the button stays visible, says why on hover and does nothing. The server decides anyway.
 */
export function useReadOnlyGate() {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const household = useQuery(convexQuery(api.household.get, space === "household" ? {} : "skip"));
	if (space !== "household" || household.data?.plus.active !== false) return {};
	return {
		"aria-disabled": true,
		title: NO_PLUS,
		onClick: (event: { preventDefault: () => void }) => event.preventDefault(),
	};
}
