import { useNavigate } from "@tanstack/react-router";
import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

type Props = {
	next: "/home" | "/onboarding";
};

export function PasskeyStep({ next }: Props) {
	const navigate = useNavigate();
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function createPasskey() {
		setError(null);
		setIsPending(true);
		const { error } = await authClient.passkey.addPasskey();
		setIsPending(false);
		if (error) {
			setError("No pudimos crear tu llave. Inténtalo otra vez o sigue sin ella.");
			return;
		}
		await navigate({ to: next });
	}

	return (
		<>
			<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
				Entra más rápido la próxima vez
			</h1>
			<p className="mt-6 break-words text-sm leading-relaxed text-muted-foreground">
				Crea una llave en este equipo y entra con tu huella o tu cara.
			</p>
			<div className="mt-8 flex flex-wrap gap-3">
				<Button
					type="button"
					variant="secondary"
					className="h-12 flex-1 rounded-full px-4"
					disabled={isPending}
					loading={isPending}
					onClick={createPasskey}
				>
					<Fingerprint strokeWidth={1.5} />
					Crear mi llave
				</Button>
				<Button
					type="button"
					variant="secondary"
					className="h-12 flex-1 rounded-full px-4"
					disabled={isPending}
					onClick={() => navigate({ to: next })}
				>
					Ahora no
				</Button>
			</div>
			{error ? (
				<p role="alert" className="mt-3 text-xs text-warning-foreground">
					{error}
				</p>
			) : null}
		</>
	);
}
