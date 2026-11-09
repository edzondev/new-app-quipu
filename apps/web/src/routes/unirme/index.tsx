import { createFileRoute } from "@tanstack/react-router";
import { JoinPage } from "#/modules/household/components/join-page";

export const Route = createFileRoute("/unirme/")({
	head: () => ({ meta: [{ title: "Quipu — Unirme a un espacio" }] }),
	component: JoinEmptyPage,
});

function JoinEmptyPage() {
	const { isAuthenticated } = Route.useRouteContext();
	return <JoinPage initialCode="" isAuthenticated={isAuthenticated} />;
}
