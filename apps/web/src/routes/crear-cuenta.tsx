import {
	type Draft,
	accountAlreadyExisted,
	emptyDraft,
	readDraft,
} from "@quipu/backend/shared/createAccount.ts";
import { authMessages, errorText } from "@quipu/backend/shared/authMessages.ts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";

const KEY = "quipu-crear";

function saveDraft(draft: Draft) {
	sessionStorage.setItem(KEY, JSON.stringify(draft));
}

function clock(until: number, now: number) {
	const seconds = Math.max(0, Math.ceil((until - now) / 1000));
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export const Route = createFileRoute("/crear-cuenta")({ component: CrearCuenta });

function CrearCuenta() {
	const navigate = useNavigate();
	const [draft, setDraft] = useState<Draft>(emptyDraft);
	const [code, setCode] = useState("");
	const [notice, setNotice] = useState("");
	const [sending, setSending] = useState(false);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		// sessionStorage does not exist during server render.
		// oxlint-disable-next-line react/set-state-in-effect
		setDraft(readDraft(sessionStorage.getItem(KEY), Date.now()));
	}, []);

	useEffect(() => {
		if (!draft.waitUntil || draft.waitUntil <= now) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [draft.waitUntil, now]);

	function update(next: Draft) {
		setDraft(next);
		saveDraft(next);
	}

	const waiting = draft.waitUntil !== null && draft.waitUntil > now;

	async function requestCode() {
		if (sending || waiting) return;
		const email = draft.email.trim().toLowerCase();
		setSending(true);
		setNotice("");
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
			fetchOptions: { headers: { "x-quipu-intent": "sign-up" } },
		});
		setSending(false);
		if (error) {
			if (error.code === "WAIT_TO_RESEND") {
				const seconds = Number(error.message);
				const until = Date.now() + (Number.isFinite(seconds) ? seconds * 1000 : 90_000);
				update({ ...draft, email, phase: "code", waitUntil: until });
				setNotice("");
				return;
			}
			setNotice(errorText(error.code, error.message));
			return;
		}
		update({ ...draft, email, phase: "code", waitUntil: Date.now() + 90_000 });
	}

	async function verify() {
		if (sending) return;
		setSending(true);
		setNotice("");
		const { data, error } = await authClient.signIn.emailOtp({
			email: draft.email.trim().toLowerCase(),
			otp: code,
			name: draft.name.trim(),
		});
		setSending(false);
		if (error || !data?.user) {
			setNotice(errorText(error?.code, error?.message));
			return;
		}
		const session = await authClient.getSession();
		if (accountAlreadyExisted(data.user.createdAt, session.data?.session.createdAt)) {
			update({ ...draft, phase: "already-existed", waitUntil: null });
			return;
		}
		update({ ...draft, phase: "passkey", waitUntil: null });
	}

	async function createPasskey() {
		if (sending) return;
		setSending(true);
		const { error } = await authClient.passkey.addPasskey();
		setSending(false);
		if (error) {
			setNotice("No pudimos crear la llave.");
			return;
		}
		sessionStorage.removeItem(KEY);
		await navigate({ to: "/hoy" });
	}

	async function continueOn() {
		sessionStorage.removeItem(KEY);
		await navigate({ to: "/hoy" });
	}

	const waitText =
		waiting && draft.waitUntil ? `Podrás pedir otro código en ${clock(draft.waitUntil, now)}` : "";
	const alertText = waitText || notice;

	if (draft.phase === "already-existed") {
		return (
			<main>
				<p>{authMessages.ALREADY_HAD_ACCOUNT}</p>
				<button type="button" onClick={() => void continueOn()}>
					Seguir
				</button>
			</main>
		);
	}

	if (draft.phase === "passkey") {
		return (
			<main>
				<h1>¿Creas tu llave en este equipo?</h1>
				{alertText ? (
					<p className="aviso" role="alert">
						{alertText}
					</p>
				) : null}
				<button type="button" disabled={sending} onClick={() => void createPasskey()}>
					Crear mi llave
				</button>
				<button type="button" className="clara" onClick={() => void continueOn()}>
					Ahora no
				</button>
			</main>
		);
	}

	return (
		<main>
			<h1>Crear cuenta</h1>
			{draft.phase === "details" ? (
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void requestCode();
					}}
				>
					<label>
						Nombre
						<input
							value={draft.name}
							autoComplete="name"
							onChange={(event) => update({ ...draft, name: event.target.value })}
						/>
					</label>
					<label>
						Correo
						<input
							type="email"
							value={draft.email}
							autoComplete="email"
							onChange={(event) => update({ ...draft, email: event.target.value })}
						/>
					</label>
					{alertText ? (
						<p className="aviso" role="alert">
							{alertText}
						</p>
					) : null}
					<button type="submit" disabled={sending || waiting || draft.name.trim() === ""}>
						{waiting && draft.waitUntil
							? `Reenviar en ${clock(draft.waitUntil, now)}`
							: "Continuar"}
					</button>
				</form>
			) : (
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void verify();
					}}
				>
					<label>
						Código
						<input
							value={code}
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={6}
							onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
						/>
					</label>
					{alertText ? (
						<p className="aviso" role="alert">
							{alertText}
						</p>
					) : null}
					<p>{authMessages.CODE_DURATION}</p>
					<button type="submit" disabled={sending || code.length !== 6}>
						Continuar
					</button>
					{waiting && draft.waitUntil ? (
						<p>Reenviar en {clock(draft.waitUntil, now)}</p>
					) : (
						<button type="button" className="enlace" onClick={() => void requestCode()}>
							Reenviar
						</button>
					)}
				</form>
			)}
		</main>
	);
}
