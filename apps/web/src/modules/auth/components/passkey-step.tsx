import { Fingerprint } from "lucide-react";
import { cn } from "cn";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";
import { authButton, authLink, authTitle } from "#/modules/auth/styles";

type Props = {
	/** Where to go once the key is made or skipped. */
	onDone: () => void;
};

export function PasskeyStep({ onDone }: Props) {
	const [isPending, setIsPending] = useState(false);
	const [failed, setFailed] = useState(false);

	async function activate() {
		setIsPending(true);
		const { error } = await authClient.passkey.addPasskey();
		if (error) {
			setIsPending(false);
			setFailed(true);
			return;
		}
		onDone();
	}

	return (
		<div className="text-center">
			<Fingerprint aria-hidden="true" strokeWidth={1.25} className="mx-auto mb-6 size-16" />
			<h1 className={cn(authTitle, "mb-4")}>Entra más rápido la próxima vez</h1>
			<p className="mb-6 text-[13px] leading-7 text-muted-foreground">
				Usa tu huella, rostro o el desbloqueo de tu celular o compu. Sin códigos.
			</p>
			{failed ? (
				<>
					<p role="alert" className="wrap-break-word text-xs text-warning-foreground">
						No se pudo activar. Puedes hacerlo luego en Ajustes.
					</p>
					<Button
						type="button"
						variant="default"
						size="xl"
						className={cn(authButton, "mt-6")}
						onClick={onDone}
					>
						Continuar
					</Button>
				</>
			) : (
				<>
					<Button
						type="button"
						variant="default"
						size="xl"
						className={authButton}
						disabled={isPending}
						loading={isPending}
						onClick={activate}
					>
						Activar huella o rostro
					</Button>
					<Button
						type="button"
						variant="ghost"
						className={cn(authLink, "mt-2 inline-flex")}
						disabled={isPending}
						onClick={onDone}
					>
						Ahora no
					</Button>
				</>
			)}
		</div>
	);
}
