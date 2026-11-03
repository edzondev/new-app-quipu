import { createFileRoute } from "@tanstack/react-router";
import { MovementsPage } from "#/modules/movements/components/movements-page";

export const Route = createFileRoute("/_app/movements")({
	component: MovementsPage,
});
