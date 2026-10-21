import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/hoy")({
	component: () => (
		<main>
			<h1>Hoy</h1>
		</main>
	),
});
