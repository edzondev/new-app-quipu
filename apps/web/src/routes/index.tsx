import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const navigate = useNavigate();
	return (
		<main>
			<h1>Divide tu dinero antes de gastarlo.</h1>
			<p>Hoy puedes gastar S/ 42.30</p>
			<button type="button" onClick={() => navigate({ to: "/sign-in" })}>
				Crear cuenta
			</button>
			<Link to="/sign-in">Ya tengo cuenta</Link>
		</main>
	);
}
