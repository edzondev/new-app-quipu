import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";

const NO_PLUS = "Activa Plus para seguir anotando";

const readOnlyProps = {
	"aria-disabled": true,
	title: NO_PLUS,
	onClick: (event: { preventDefault: () => void }) => event.preventDefault(),
};

/**
 * Props to spread after a button's own `onClick` when Nuestro espacio is read-only (the Plus
 * lapsed): the button stays visible, says why on hover and does nothing. The server decides anyway.
 */
export function useReadOnlyGate() {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const household = useQuery(convexQuery(api.household.get, space === "household" ? {} : "skip"));
	if (space !== "household" || household.data?.plus.active !== false) return {};
	return readOnlyProps;
}

/** The same for what is about the household whatever the address says, like its settings. */
export function useHouseholdGate(enabled: boolean) {
	const household = useQuery(convexQuery(api.household.get, enabled ? {} : "skip"));
	return enabled && household.data?.plus.active === false ? readOnlyProps : {};
}
