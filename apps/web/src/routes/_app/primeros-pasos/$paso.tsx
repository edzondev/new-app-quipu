import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/primeros-pasos/$paso")({
	component: Paso,
});

function Paso() {
	const { paso } = Route.useParams();
	const { perfil } = Route.useRouteContext();
	return (
		<main>
			<p>Seguimos donde te quedaste.</p>
			<p>{paso}</p>
			{perfil?.draftSalaryCents !== undefined ? <p>{perfil.draftSalaryCents}</p> : null}
			{perfil?.draftPayday !== undefined ? <p>{perfil.draftPayday}</p> : null}
		</main>
	);
}
