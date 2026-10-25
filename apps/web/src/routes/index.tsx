import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Inicio });

function Inicio() {
	const navigate = useNavigate();
	return (
		<main>
			<h1>Divide tu dinero antes de gastarlo.</h1>
			<p>Hoy puedes gastar S/ 42.30</p>
			<button type="button" onClick={() => navigate({ to: "/crear-cuenta" })}>
				Crear cuenta
			</button>
			<Link to="/">Ya tengo cuenta</Link>
		</main>
	);
}
