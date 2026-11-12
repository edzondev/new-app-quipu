import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { addDays, formatFullDay } from "@quipu/backend/shared/dates";
import { DELETION_DAYS } from "@quipu/backend/shared/deletion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";
import {
	FormSheetClose,
	FormSheetDescription,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetTitle,
} from "#/components/form-sheet";
import { Button } from "#/components/ui/button";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { useLimaDate } from "#/hooks/use-lima-date";
import { authClient, reloadTo } from "#/lib/auth-client";
import { readError } from "#/lib/read-error";
import { ActionDialog } from "./action-dialog";

const AMBER =
	"border-warning/32 bg-warning/16 text-warning-foreground hover:bg-warning/24 hover:text-warning-foreground";

const SEND_ERROR = "No pudimos enviar el código. Intenta de nuevo.";
const CONFIRM_ERROR = "No pudimos eliminar tu cuenta. Intenta de nuevo.";

function DeleteAccount({ hasHousehold }: { hasHousehold: boolean }) {
	const today = useLimaDate();
	const runsOn = formatFullDay(addDays(today, DELETION_DAYS));
	const status = useQuery(convexQuery(api.billing.status, {}));
	const household = useQuery(convexQuery(api.household.get, hasHousehold ? {} : "skip"));
	const session = authClient.useSession();
	const [code, setCode] = useState("");
	const requestCode = useConvexMutation(api.accountDeletion.requestCode);
	const confirmDeletion = useConvexMutation(api.accountDeletion.confirm);
	const send = useMutation({ mutationFn: () => requestCode({}) });
	const confirm = useMutation({
		mutationFn: async () => {
			const result = await confirmDeletion({ code });
			if (result.ok) await reloadTo("/sign-in");
			return result;
		},
	});

	const codeSent = send.isSuccess;
	const partnerName = household.data?.partnerName ?? null;
	const paysWithOwnSubscription = status.data?.kind === "paid" || status.data?.kind === "pastDue";
	let error: string | null = null;
	if (send.isError) error = readError(send.error, SEND_ERROR);
	else if (confirm.isError) error = readError(confirm.error, CONFIRM_ERROR);
	else if (confirm.data && !confirm.data.ok) error = confirm.data.error;

	return (
		<form
			noValidate
			className="contents"
			onSubmit={(event) => {
				event.preventDefault();
				if (codeSent) confirm.mutate();
				else send.mutate();
			}}
		>
			<FormSheetHeader>
				<FormSheetTitle>{codeSent ? "Revisa tu correo" : "Eliminar tu cuenta"}</FormSheetTitle>
				<FormSheetDescription className="wrap-anywhere">
					{codeSent
						? `Escribe el código que enviamos a ${session.data?.user.email ?? "tu correo"}.`
						: `El ${runsOn} borraremos tu cuenta y tus datos en Quipu. Hasta ese día puedes cancelar.`}
				</FormSheetDescription>
			</FormSheetHeader>
			<FormSheetPanel>
				{codeSent ? (
					<Field name="code" invalid={confirm.data?.ok === false}>
						<FieldLabel>Código</FieldLabel>
						<Input
							autoFocus
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={6}
							placeholder="000000"
							value={code}
							onChange={(event) => {
								setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
								confirm.reset();
							}}
						/>
					</Field>
				) : (
					<div className="space-y-2 text-sm">
						{household.data ? <p>Saldrás de Nuestro espacio.</p> : null}
						{partnerName ? <p>Lo que anotaste ahí se queda para {partnerName}.</p> : null}
						{partnerName && household.data?.plus.active && household.data.plus.payerIsMe ? (
							<p>
								{partnerName} perderá Plus el {runsOn}.
							</p>
						) : null}
						{paysWithOwnSubscription ? (
							<div>
								<p>Tu Quipu Plus sigue activo.</p>
								<p>Cancélalo aparte para que no se te cobre.</p>
								<Link
									to="/settings/subscription"
									className="inline-flex min-h-11 items-center font-semibold underline"
								>
									Administrar suscripción
								</Link>
							</div>
						) : null}
					</div>
				)}
				{error ? (
					<p role="alert" className="wrap-break-word mt-3 text-xs text-warning-foreground">
						{error}
					</p>
				) : null}
			</FormSheetPanel>
			<FormSheetFooter variant="bare">
				<FormSheetClose
					render={<Button type="button" variant="outline" size="xl" className="rounded-full" />}
				>
					Cancelar
				</FormSheetClose>
				<Button
					type="submit"
					variant="outline"
					size="xl"
					className={cn("rounded-full", AMBER)}
					disabled={send.isPending || confirm.isPending || (codeSent && code.length < 6)}
					loading={send.isPending}
				>
					{confirm.isPending ? "Eliminando…" : codeSent ? "Eliminar cuenta" : "Enviar código"}
				</Button>
			</FormSheetFooter>
		</form>
	);
}

export function DeleteAccountDialog({
	hasHousehold,
	defaultOpen,
}: {
	hasHousehold: boolean;
	defaultOpen: boolean;
}) {
	const navigate = useNavigate();
	return (
		<ActionDialog
			label="Eliminar cuenta"
			defaultOpen={defaultOpen}
			onClose={() => {
				// Quita ?eliminar=true para que la recarga no vuelva a abrir el modal.
				if (defaultOpen) void navigate({ to: "/settings", search: {}, replace: true });
			}}
			className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-warning-foreground underline-offset-4 hover:underline"
		>
			{() => <DeleteAccount hasHousehold={hasHousehold} />}
		</ActionDialog>
	);
}
