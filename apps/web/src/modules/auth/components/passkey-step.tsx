import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

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
		setIsPending(false);
		if (error) {
			setFailed(true);
			return;
		}
		onDone();
	}

	return (
		<>
			<h1 className="text-[42px] font-normal leading-tight tracking-tight sm:text-[52px]">
				Entra más rápido la próxima vez
			</h1>
			<p className="mt-6 text-sm leading-relaxed text-muted-foreground">
				Usa tu huella o tu rostro en lugar del código.
			</p>
			{failed ? (
				<>
					<p role="alert" className="mt-8 text-xs text-warning-foreground">
						No se pudo activar. Puedes hacerlo luego en Ajustes.
					</p>
					<Button
						type="button"
						variant="default"
						size="xl"
						className="mt-6 w-full rounded-full"
						onClick={onDone}
					>
						Continuar
					</Button>
				</>
			) : (
				<div className="mt-8 flex flex-col gap-3">
					<Button
						type="button"
						variant="default"
						size="xl"
						className="w-full rounded-full"
						disabled={isPending}
						loading={isPending}
						onClick={activate}
					>
						<Fingerprint strokeWidth={1.5} />
						Activar huella o rostro
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xl"
						className="w-full rounded-full"
						disabled={isPending}
						onClick={onDone}
					>
						Ahora no
					</Button>
				</div>
			)}
		</>
	);
}
