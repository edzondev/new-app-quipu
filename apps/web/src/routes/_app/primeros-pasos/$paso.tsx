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
			{perfil?.borradorSueldoCentimos !== undefined ? <p>{perfil.borradorSueldoCentimos}</p> : null}
			{perfil?.borradorDiaDeCobro !== undefined ? <p>{perfil.borradorDiaDeCobro}</p> : null}
		</main>
	);
}
