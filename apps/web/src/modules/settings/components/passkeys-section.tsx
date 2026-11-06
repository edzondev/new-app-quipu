import { formatPastDay, getLimaDate } from "@quipu/backend/shared/dates";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";
import { type AuthError, getAuthErrorMessage } from "#/lib/auth-errors";
import { EYEBROW } from "#/lib/typography";
import { type Passkey, passkeysQuery, unwrap } from "../auth-queries";
import { AuthErrorNotice } from "./auth-error-notice";

/**
 * Only an aborted ceremony counts as a cancel. Limit: this client drops the error's name and cause,
 * so a prompt the person closes (a NotAllowedError, passed through as
 * ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY) cannot be told apart reliably from other failures. It is
 * shown like any other error.
 */
function isCancelled(error: NonNullable<AuthError>) {
	return error.code === "ERROR_CEREMONY_ABORTED";
}

function PasskeyRow({ passkey, today }: { passkey: Passkey; today: string }) {
	const queryClient = useQueryClient();
	const [confirming, setConfirming] = useState(false);
	const remove = useMutation<unknown, NonNullable<AuthError>>({
		mutationFn: () => unwrap(authClient.passkey.deletePasskey({ id: passkey.id })),
		onSuccess: () => queryClient.invalidateQueries(passkeysQuery),
	});

	return (
		<li className="flex items-center justify-between gap-3 border-b border-border/80 py-3">
			<div className="min-w-0">
				<p className="truncate text-sm font-semibold">{passkey.name ?? "Llave de acceso"}</p>
				<p className="text-xs text-muted-foreground">
					Creada el {formatPastDay(getLimaDate(new Date(passkey.createdAt)), today)}
				</p>
			</div>
			<Button type="button" variant="outline" size="xl" onClick={() => setConfirming(true)}>
				Borrar
			</Button>
			<AlertDialog open={confirming} onOpenChange={setConfirming}>
				<AlertDialogPopup>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Borrar esta llave?</AlertDialogTitle>
					</AlertDialogHeader>
					{remove.isError ? (
						<p role="alert" className="px-6 pb-4 text-xs text-warning-foreground">
							{getAuthErrorMessage(remove.error)}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogClose render={<Button variant="outline" size="xl" />}>
							Cancelar
						</AlertDialogClose>
						<Button size="xl" loading={remove.isPending} onClick={() => remove.mutate()}>
							Borrar
						</Button>
					</AlertDialogFooter>
				</AlertDialogPopup>
			</AlertDialog>
		</li>
	);
}

export function PasskeysSection({ today }: { today: string }) {
	const queryClient = useQueryClient();
	const passkeys = useQuery(passkeysQuery);
	const add = useMutation<unknown, NonNullable<AuthError>>({
		mutationFn: () => unwrap(authClient.passkey.addPasskey()),
		onSuccess: () => queryClient.invalidateQueries(passkeysQuery),
	});
	// Not `add.isPending`: the button only learns about it a render later, and a fast double click
	// has already sent a second request by then.
	const adding = useRef(false);

	async function addPasskey() {
		if (adding.current) return;
		adding.current = true;
		try {
			await add.mutateAsync();
		} catch {
			// The failure is already in `add.error`, shown below.
		} finally {
			adding.current = false;
		}
	}

	return (
		<section aria-labelledby="passkeys-title">
			<h3 id="passkeys-title" className={EYEBROW}>
				Llaves de acceso
			</h3>
			{passkeys.isError ? (
				<p role="alert" className="mt-2 text-xs text-warning-foreground">
					{getAuthErrorMessage(passkeys.error)}
				</p>
			) : null}
			{passkeys.data?.length === 0 ? (
				<p className="mt-2 text-sm text-muted-foreground">Todavía no tienes una llave de acceso.</p>
			) : null}
			<ul className="mt-1">
				{passkeys.data?.map((passkey) => (
					<PasskeyRow key={passkey.id} passkey={passkey} today={today} />
				))}
			</ul>
			{add.isError && !isCancelled(add.error) ? (
				<div className="mt-3">
					<AuthErrorNotice error={add.error} goal="agregar una llave" />
				</div>
			) : null}
			<Button
				type="button"
				variant="outline"
				size="xl"
				className="mt-4 rounded-full"
				loading={add.isPending}
				onClick={addPasskey}
			>
				Agregar una llave
			</Button>
		</section>
	);
}
