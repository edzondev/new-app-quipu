import { formatPastDay, getLimaDate } from "@quipu/backend/shared/dates";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { useSignOut } from "#/hooks/use-sign-out";
import { authClient } from "#/lib/auth-client";
import { type AuthError, getAuthErrorMessage } from "#/lib/auth-errors";
import { EYEBROW } from "#/lib/typography";
import { type SessionList, sessionsQuery, unwrap } from "../auth-queries";
import { AuthErrorNotice } from "./auth-error-notice";

function SessionRow({
	session,
	isCurrent,
	today,
}: {
	session: SessionList["sessions"][number];
	isCurrent: boolean;
	today: string;
}) {
	const queryClient = useQueryClient();
	const revoke = useMutation<unknown, NonNullable<AuthError>>({
		mutationFn: () => unwrap(authClient.revokeSession({ token: session.token })),
		onSuccess: () => queryClient.invalidateQueries(sessionsQuery),
	});

	return (
		<li className="flex items-center justify-between gap-3 border-b border-border/80 py-3">
			<div className="min-w-0">
				<p className="truncate text-sm font-semibold">
					{isCurrent ? "Este navegador" : "Otro dispositivo"}
				</p>
				<p className="text-xs text-muted-foreground">
					Iniciada el {formatPastDay(getLimaDate(new Date(session.createdAt)), today)}
				</p>
				{revoke.isError ? (
					<p role="alert" className="text-xs text-warning-foreground">
						{getAuthErrorMessage(revoke.error)}
					</p>
				) : null}
			</div>
			{isCurrent ? null : (
				<Button
					type="button"
					variant="outline"
					size="xl"
					loading={revoke.isPending}
					onClick={() => revoke.mutate()}
				>
					Cerrar
				</Button>
			)}
		</li>
	);
}

function SignOutAllButton() {
	const [confirming, setConfirming] = useState(false);
	const signOutAll = useSignOut("all");

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="xl"
				className="mt-4 rounded-full"
				onClick={() => setConfirming(true)}
			>
				Cerrar todas las sesiones
			</Button>
			<AlertDialog open={confirming} onOpenChange={setConfirming}>
				<AlertDialogPopup>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Cerrar todas las sesiones?</AlertDialogTitle>
						<AlertDialogDescription>También saldrás de este dispositivo.</AlertDialogDescription>
					</AlertDialogHeader>
					{signOutAll.isError ? (
						<p role="alert" className="px-6 pb-4 text-xs text-warning-foreground">
							{getAuthErrorMessage(signOutAll.error)}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogClose render={<Button variant="outline" size="xl" />}>
							Cancelar
						</AlertDialogClose>
						<Button size="xl" loading={signOutAll.isPending} onClick={() => signOutAll.mutate()}>
							Cerrar todas
						</Button>
					</AlertDialogFooter>
				</AlertDialogPopup>
			</AlertDialog>
		</>
	);
}

export function SessionsSection({ today }: { today: string }) {
	const sessions = useQuery(sessionsQuery);

	return (
		<section aria-labelledby="sessions-title" className="mt-8">
			<h3 id="sessions-title" className={EYEBROW}>
				Sesiones activas
			</h3>
			{sessions.isError ? <AuthErrorNotice error={sessions.error} goal="ver tus sesiones" /> : null}
			<ul className="mt-1">
				{sessions.data?.sessions.map((session) => (
					<SessionRow
						key={session.id}
						session={session}
						isCurrent={session.id === sessions.data.currentId}
						today={today}
					/>
				))}
			</ul>
			<SignOutAllButton />
		</section>
	);
}
