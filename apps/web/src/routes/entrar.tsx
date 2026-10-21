import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/entrar")({
	component: () => <p>Entrar</p>,
});
