import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_app/home")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();

	return (
		<div>
			<Button
				onClick={() => {
					void authClient.signOut({
						fetchOptions: {
							onSuccess: () => {
								void navigate({ to: "/sign-in" });
							},
						},
					});
				}}
			>
				Cerrar Sesión
			</Button>
		</div>
	);
}
