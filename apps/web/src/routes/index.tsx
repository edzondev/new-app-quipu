import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) throw redirect({ to: "/home" });
	},
	component: Landing,
});

function Landing() {
	const navigate = useNavigate();

	return (
		<main>
			<h1>Divide tu dinero antes de gastarlo.</h1>
			<p>Hoy puedes gastar S/ 42.30</p>
			<Button onClick={() => navigate({ to: "/sign-up", search: { email: "" } })}>
				Crear cuenta
			</Button>
			<Link to="/sign-in">Ya tengo cuenta</Link>
		</main>
	);
}
