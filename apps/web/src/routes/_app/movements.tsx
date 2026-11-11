import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { isEmptyHousehold } from "#/lib/empty-household";
import { MovementsPage } from "#/modules/movements/components/movements-page";

export const Route = createFileRoute("/_app/movements")({
	// Only Nuestro espacio has the second view; the address keeps it so Atrás comes back to it.
	validateSearch: (search: Record<string, unknown>): { vista?: "actividad" } =>
		search.vista === "actividad" ? { vista: "actividad" } : {},
	loader: async ({ context }) => {
		if (isEmptyHousehold(context)) return;
		// Without a personal plan Personal has nothing to load.
		if (context.space === "personal" && !context.hasPlan) return;
		const args = { space: context.space, today: context.today };
		await Promise.all([
			context.queryClient.query(convexQuery(api.transactions.list, args)),
			context.queryClient.query(convexQuery(api.balances.getHome, args)),
		]);
	},
	component: MovementsPage,
});
