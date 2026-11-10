import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { extractCode } from "@quipu/backend/shared/household";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useRef, useState } from "react";
import { QuipuHeader } from "#/components/quipu-header";
import { Button } from "#/components/ui/button";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { readError } from "#/lib/read-error";
import { inviteState } from "../invite-state";
import { useInviteInfo } from "../use-invite-info";

function Message({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div role="status" className="text-sm">
			<p className="font-semibold">{title}</p>
			<p className="text-muted-foreground">{children}</p>
		</div>
	);
}

function ReasonMessage({
	reason,
	inviter,
}: {
	reason: "invalid" | "expired" | "full" | "rate_limited";
	inviter: string;
}) {
	if (reason === "rate_limited") {
		return <Message title="Muchos intentos.">Prueba de nuevo en unos minutos.</Message>;
	}
	if (reason === "invalid") {
		return <Message title="Ese código no existe.">Revísalo o pide uno nuevo.</Message>;
	}
	return (
		<Message title="Esta invitación ya no sirve.">Pídele a {inviter} que te envíe otra.</Message>
	);
}

/** /unirme and /unirme/$code: one page. The code field shows when there is no code or it does not work. */
export function JoinPage({
	initialCode,
	isAuthenticated,
}: {
	initialCode: string;
	isAuthenticated: boolean;
}) {
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);
	const [code, setCode] = useState(extractCode(initialCode));
	const [edited, setEdited] = useState(false);
	// Read once: the clock only matters to tell an old invite from a new one.
	const [now] = useState(Date.now);

	const profile = useQuery(convexQuery(api.profiles.myProfile, isAuthenticated ? {} : "skip"));
	const info = useInviteInfo(code);
	const joinHousehold = useConvexMutation(api.household.joinHousehold);
	function onJoined(result: { ok: boolean }) {
		if (result.ok) void navigate({ to: "/home", search: { space: "household", joined: true } });
	}
	const join = useMutation({ mutationFn: () => joinHousehold({ code }), onSuccess: onJoined });
	// Only for who already has a household of their own with nothing in it.
	const replace = useMutation({
		mutationFn: () => joinHousehold({ code, replaceEmpty: true }),
		onSuccess: onJoined,
	});

	// Joining and replacing an empty household answer the same way, so one reading serves both.
	const result = replace.data ?? join.data;
	const reason = result && !result.ok ? result.reason : null;
	// Seven characters never reach the server: there is no such code.
	const lookup =
		code.length > 6
			? "missing"
			: code.length < 6
				? "typing"
				: info.isError
					? "error"
					: info.data === undefined
						? "loading"
						: inviteState(info.data, now);
	const view =
		reason === "rate_limited"
			? "rate"
			: reason === "invalid"
				? "missing"
				: reason
					? "unusable"
					: lookup;
	const inviter = info.data?.inviterName ?? "tu pareja";
	const canJoin = view === "valid" || view === "rate";
	const showCard = initialCode !== "" && !edited && (canJoin || view === "loading");
	// Already in a space: while joining, the profile flips first and must not hide the card.
	const alreadyIn =
		profile.data?.hasHousehold && !join.isPending && !replace.isPending && result?.ok !== true;
	const mineIsEmpty = useQuery(convexQuery(api.household.isEmpty, alreadyIn ? {} : "skip"));

	function writeAnother() {
		setCode("");
		setEdited(true);
		join.reset();
		replace.reset();
		inputRef.current?.focus();
	}

	function onJoin() {
		if (isAuthenticated) join.mutate();
		else void navigate({ to: "/sign-in", search: { redirect: `/unirme/${code}` } });
	}

	const actions = (
		<div className="mt-8 flex flex-col gap-3">
			{view === "rate" ? (
				<Message title="Muchos intentos.">Prueba de nuevo en unos minutos.</Message>
			) : null}
			{join.isError ? (
				<p role="alert" className="wrap-break-word text-xs text-warning-foreground">
					{readError(join.error)}
				</p>
			) : null}
			<Button
				size="xl"
				className="rounded-full"
				disabled={!canJoin}
				loading={join.isPending}
				onClick={onJoin}
			>
				Unirme
			</Button>
			{isAuthenticated ? null : (
				<Button
					variant="outline"
					size="xl"
					className="rounded-full"
					render={<Link to="/sign-in" search={{ redirect: `/unirme/${code}` }} />}
				>
					Ya tengo cuenta · Entrar
				</Button>
			)}
		</div>
	);

	let body: ReactNode;
	if (alreadyIn) {
		body = (
			<>
				<Message title="Ya estás en un espacio.">Solo puedes estar en uno.</Message>
				<Button
					size="xl"
					className="mt-8 w-full rounded-full"
					render={<Link to="/home" search={{ space: "household" }} />}
				>
					Ir a mi espacio
				</Button>
				{reason ? <ReasonMessage reason={reason} inviter={inviter} /> : null}
				{mineIsEmpty.data && canJoin ? (
					<Button
						variant="outline"
						size="xl"
						className="mt-3 w-full rounded-full"
						loading={replace.isPending}
						onClick={() => replace.mutate()}
					>
						Borrar el mío y unirme
					</Button>
				) : null}
				{replace.isError ? (
					<p role="alert" className="wrap-break-word mt-3 text-xs text-warning-foreground">
						{readError(replace.error)}
					</p>
				) : null}
			</>
		);
	} else if (showCard) {
		body =
			info.data === undefined ? (
				<div role="status" aria-busy="true" aria-label="Cargando" className="space-y-4">
					<Skeleton className="h-12 w-4/5" />
					<Skeleton className="h-4 w-3/5" />
				</div>
			) : (
				<>
					<p className="text-sm text-muted-foreground">Invitación</p>
					<h1 className="wrap-break-word mt-3 text-[36px] font-normal leading-tight tracking-tight sm:text-[44px]">
						{inviter} te invitó a su espacio
					</h1>
					<p className="mt-4 text-muted-foreground">
						Para llevar juntos los gastos de la casa en Quipu.
					</p>
					<p className="mt-2 text-muted-foreground">Lo tuyo personal sigue siendo privado.</p>
					{actions}
				</>
			);
	} else {
		body = (
			<>
				<h1 className="text-[36px] font-normal leading-tight tracking-tight sm:text-[44px]">
					¿Tienes un código?
				</h1>
				<p className="mt-4 text-muted-foreground">Te lo pasó tu pareja. Son 6 letras y números.</p>
				<Field name="code" className="mt-8">
					<FieldLabel className="text-sm font-normal text-muted-foreground">Código</FieldLabel>
					<Input
						ref={inputRef}
						value={code}
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						onChange={(event) => {
							setCode(extractCode(event.target.value));
							setEdited(true);
							join.reset();
							replace.reset();
						}}
						unstyled
						className="w-full border-0 border-b border-input bg-transparent has-focus-visible:border-foreground [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-3.5 [&_[data-slot=input]]:font-mono [&_[data-slot=input]]:text-lg [&_[data-slot=input]]:tracking-widest"
					/>
				</Field>
				{view === "error" ? (
					<div className="mt-6 space-y-4">
						<p role="alert" className="text-sm font-semibold">
							No pudimos cargar la invitación.
						</p>
						<Button
							variant="outline"
							size="xl"
							className="rounded-full"
							loading={info.isFetching}
							onClick={() => void info.refetch()}
						>
							Reintentar
						</Button>
					</div>
				) : view === "missing" ? (
					<div className="mt-6 space-y-4">
						<Message title="Ese código no existe.">Revísalo o pide uno nuevo.</Message>
						<Button variant="outline" size="xl" className="rounded-full" onClick={writeAnother}>
							Escribir otro código
						</Button>
					</div>
				) : view === "unusable" ? (
					<div className="mt-6 space-y-3">
						<Message title="Esta invitación ya no sirve.">
							Pídele a {inviter} que te envíe otra.
						</Message>
						<button
							type="button"
							className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground pointer-coarse:min-h-11"
							onClick={writeAnother}
						>
							¿Tienes otro código?
						</button>
					</div>
				) : (
					actions
				)}
			</>
		);
	}

	return (
		<div className="min-h-svh bg-background text-foreground">
			<QuipuHeader />
			<main className="mx-auto w-full max-w-124 px-7 pb-16 pt-6 sm:pt-10">{body}</main>
		</div>
	);
}
