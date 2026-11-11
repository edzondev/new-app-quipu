import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";
import { useMutation } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { useNow } from "#/hooks/use-now";
import { readError } from "#/lib/read-error";
import { copyText, inviteToast, inviteUrl, shareInvite } from "../invite-link";
import { inviteState } from "../invite-state";

type Props = { invite: { code: string; expiresAt: number }; firstName: string };

/** W-U1 while the invite is valid, W-U2 once it expired. Only who invited sees it. */
export function InviteStrip({ invite, firstName }: Props) {
	const createInvite = useConvexMutation(api.household.createInvite);
	// The query does not run again when time passes: the clock moves at expiresAt and on coming back to the tab.
	const now = useNow([invite.expiresAt]);
	const expired = inviteState(invite, now) === "unusable";

	// The share menu, or the link copied when the browser has none. `sharedTitle` only once it really shared.
	async function shareOrCopy(code: string, sharedTitle: string | null) {
		const result = await shareInvite(code, firstName);
		if (result === "shared" && sharedTitle) inviteToast(sharedTitle);
		else if (result === "unavailable" && (await copyText(inviteUrl(code)))) {
			inviteToast("Enlace copiado");
		}
	}

	const resend = useMutation({
		mutationFn: async () => {
			const { code } = await createInvite({});
			await shareOrCopy(code, "Invitación enviada");
		},
	});
	// Mutations only for isPending: a second tap waits for the first.
	const share = useMutation({ mutationFn: () => shareOrCopy(invite.code, null) });
	const copyCode = useMutation({
		mutationFn: async () => {
			if (await copyText(invite.code)) inviteToast("Código copiado");
		},
	});
	const busy = share.isPending || copyCode.isPending;

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
							loading={share.isPending}
							disabled={busy}
							onClick={() => share.mutate()}
						>
							Compartir invitación
						</Button>
						<Button
							variant="outline"
							className="rounded-full pointer-coarse:min-h-11"
							loading={copyCode.isPending}
							disabled={busy}
							onClick={() => copyCode.mutate()}
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
