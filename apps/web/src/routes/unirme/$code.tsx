import { createFileRoute } from "@tanstack/react-router";
import { JoinPage } from "#/modules/household/components/join-page";

export const Route = createFileRoute("/unirme/$code")({
	head: () => ({ meta: [{ title: "Quipu — Unirme a un espacio" }] }),
	component: JoinCodePage,
});

function JoinCodePage() {
	const { code } = Route.useParams();
	const { isAuthenticated } = Route.useRouteContext();
	return <JoinPage key={code} initialCode={code} isAuthenticated={isAuthenticated} />;
}
