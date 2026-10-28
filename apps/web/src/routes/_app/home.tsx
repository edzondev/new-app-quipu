import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";
import { getAuthErrorMessage } from "#/lib/auth-errors";

export const Route = createFileRoute("/_app/home")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function signOut() {
		setError(null);
		setIsPending(true);
		const { error } = await authClient.signOut();
		setIsPending(false);
		if (error) {
			setError(getAuthErrorMessage(error));
			return;
		}
		await navigate({ to: "/sign-in" });
	}

	return (
		<div>
			<Button disabled={isPending} loading={isPending} onClick={signOut}>
				Cerrar sesión
			</Button>
			{error ? (
				<p role="alert" className="mt-3 text-xs text-warning-foreground">
					{error}
				</p>
			) : null}
		</div>
	);
}
