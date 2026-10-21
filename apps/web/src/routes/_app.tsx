import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api.js";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ context, location }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/entrar" });
		const perfil = await context.queryClient.ensureQueryData(
			convexQuery(api.perfiles.miPerfil, {}),
		);
		if (
			perfil &&
			perfil.pasoActual !== "listo" &&
			!location.pathname.startsWith("/primeros-pasos")
		) {
			throw redirect({
				to: "/primeros-pasos/$paso",
				params: { paso: perfil.pasoActual },
			});
		}
		return { perfil };
	},
	component: Marco,
});

function Marco() {
	return (
		<>
			<Outlet />
			<p className="salir">
				<button
					type="button"
					className="enlace"
					onClick={() => {
						void authClient.signOut({
							fetchOptions: { onSuccess: () => location.reload() },
						});
					}}
				>
					Salir
				</button>
			</p>
		</>
	);
}
