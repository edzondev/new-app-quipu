import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/eliminar-cuenta")({
	beforeLoad: ({ context }) => {
		if (!context.isAuthenticated) {
			throw redirect({ to: "/sign-in", search: { redirect: "/eliminar-cuenta" } });
		}
		throw redirect({ to: "/settings", search: { eliminar: true } });
	},
});
