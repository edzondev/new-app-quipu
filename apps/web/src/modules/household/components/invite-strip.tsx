import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { toastManager } from "#/components/ui/toast";
import { readError } from "#/lib/read-error";
import { copyText, inviteUrl, shareInvite } from "../invite-link";
import { inviteState } from "../invite-state";

type Props = { invite: { code: string; expiresAt: number }; firstName: string };

/** W-U1 while the invite is valid, W-U2 once it expired. Only who invited sees it. */
export function InviteStrip({ invite, firstName }: Props) {
	const createInvite = useConvexMutation(api.household.createInvite);
	// The query does not run again when time passes, so the page compares with the clock.
	const [now] = useState(Date.now);
	const expired = inviteState(invite, now) === "unusable";

	const resend = useMutation({
		mutationFn: async () => {
			const { code } = await createInvite({});
			toastManager.add({ title: "Invitación enviada", type: "success" });
			await shareInvite(code, firstName);
		},
	});

	async function share() {
		if ((await shareInvite(invite.code, firstName)) === "shared") return;
		if (await copyText(inviteUrl(invite.code))) {
			toastManager.add({ title: "Enlace copiado", type: "success" });
		}
	}

	async function copyCode() {
		if (await copyText(invite.code)) {
			toastManager.add({ title: "Código copiado", type: "success" });
		}
	}

	return (
		<div className="mt-6 flex flex-col gap-2 text-sm">
			{expired ? (
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
					<p>La invitación venció. Envía una nueva para que tu pareja pueda entrar.</p>
					<Button
						variant="outline"
						className="rounded-full pointer-coarse:min-h-11"
						loading={resend.isPending}
						onClick={() => resend.mutate()}
					>
						Volver a enviar invitación
					</Button>
				</div>
			) : (
				<>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<p>
							Tu pareja aún no entra. Código{" "}
							<span className="font-mono font-semibold">{invite.code}</span>.
						</p>
						<Button
							variant="outline"
							className="rounded-full pointer-coarse:min-h-11"
							onClick={share}
						>
							Compartir invitación
						</Button>
						<Button
							variant="outline"
							className="rounded-full pointer-coarse:min-h-11"
							onClick={copyCode}
						>
							Copiar código
						</Button>
					</div>
					<p className="text-muted-foreground">
						Vence el {formatDay(getLimaDate(new Date(invite.expiresAt)))}.
					</p>
				</>
			)}
			{resend.isError ? (
				<p role="alert" className="text-xs text-warning-foreground">
					{readError(resend.error)}
				</p>
			) : null}
		</div>
	);
}
