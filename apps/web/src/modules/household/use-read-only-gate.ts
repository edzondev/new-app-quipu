import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useOpenPlus } from "#/modules/plus/plus-provider";

const NO_PLUS = "Activa Plus para seguir anotando";

function useGate(blocked: boolean) {
	const openPlus = useOpenPlus();
	if (!blocked) return {};
	return {
		"aria-haspopup": "dialog" as const,
		title: NO_PLUS,
		onClick: (event: MouseEvent<HTMLElement>) => {
			event.preventDefault();
			openPlus({ highlight: "household", opener: event.currentTarget });
		},
	};
}

export function useReadOnlyGate() {
	return useGate(useIsReadOnly());
}

/** Whether the space in the address is a household without Plus. */
export function useIsReadOnly() {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const household = useQuery(convexQuery(api.household.get, space === "household" ? {} : "skip"));
	return space === "household" && household.data?.plus.active === false;
}

/** The same for what is about the household whatever the address says, like its settings. */
export function useHouseholdGate(enabled: boolean) {
	const household = useQuery(convexQuery(api.household.get, enabled ? {} : "skip"));
	return useGate(enabled && household.data?.plus.active === false);
}
