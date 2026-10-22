import { authMessages, errorText } from "@quipu/backend/shared/authMessages.ts";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";

const KEY = "quipu-entrar";

function browserSupportsWebAuthn() {
	return (
		globalThis.PublicKeyCredential !== undefined &&
		typeof globalThis.PublicKeyCredential === "function"
	);
}

function clock(until: number, now: number) {
	const seconds = Math.max(0, Math.ceil((until - now) / 1000));
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function readWait() {
	const until = Number(sessionStorage.getItem(KEY) ?? 0);
	return until > Date.now() ? until : null;
}

export const Route = createFileRoute("/entrar")({ component: Entrar });

function Entrar() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [phase, setPhase] = useState<"choose" | "code" | "passkey">("choose");
	const [notice, setNotice] = useState("");
	const [sending, setSending] = useState(false);
	const [waitUntil, setWaitUntil] = useState<number | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const [canPasskey, setCanPasskey] = useState(false);

	useEffect(() => {
		// sessionStorage and PublicKeyCredential do not exist during server render.
		// oxlint-disable-next-line react/set-state-in-effect
		setWaitUntil(readWait());
		// oxlint-disable-next-line react/set-state-in-effect
		setCanPasskey(browserSupportsWebAuthn());
	}, []);

	useEffect(() => {
		if (!waitUntil || waitUntil <= Date.now()) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [waitUntil]);

	const waiting = waitUntil !== null && waitUntil > now;
	const waitText =
		waiting && waitUntil ? `Podrás pedir otro código en ${clock(waitUntil, now)}` : "";
	const alertText = notice || waitText;

	async function signInWithPasskey() {
		setNotice("");
		const { error } = await authClient.signIn.passkey();
		if (!error) {
			await navigate({ to: "/hoy" });
			return;
		}
		const codeName = "code" in error ? error.code : undefined;
		if (
			codeName === "ERROR_CEREMONY_ABORTED" ||
			codeName === "AUTH_CANCELLED" ||
			codeName === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY"
		) {
			return;
		}
		setNotice(authMessages.PASSKEY);
	}

	async function requestCode() {
		if (sending || waiting) return;
		const address = email.trim().toLowerCase();
		setSending(true);
		setNotice("");
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email: address,
			type: "sign-in",
			fetchOptions: { headers: { "x-quipu-intent": "sign-in" } },
		});
		setSending(false);
		if (error?.code === "WAIT_TO_RESEND") {
			const seconds = Number(error.message);
			const until = Date.now() + (Number.isFinite(seconds) ? seconds * 1000 : 90_000);
			sessionStorage.setItem(KEY, String(until));
			setWaitUntil(until);
			setPhase("code");
			return;
		}
		if (error) {
			setNotice(errorText(error.code, error.message, "status" in error ? error.status : undefined));
			return;
		}
		const until = Date.now() + 90_000;
		sessionStorage.setItem(KEY, String(until));
		setWaitUntil(until);
		setPhase("code");
		setNotice(errorText("CODE_IF_ACCOUNT_EXISTS"));
	}

	async function verify() {
		if (sending) return;
		setSending(true);
		const { error } = await authClient.signIn.emailOtp({
			email: email.trim().toLowerCase(),
			otp: code,
		});
		setSending(false);
		if (!error) {
			setNotice("");
			setPhase("passkey");
			return;
		}
		const status = "status" in error ? error.status : undefined;
		const seconds = Number(error.message);
		if ((error.code === "WAIT_TO_RESEND" || status === 429) && Number.isFinite(seconds)) {
			const until = Date.now() + seconds * 1000;
			sessionStorage.setItem(KEY, String(until));
			setWaitUntil(until);
			setNotice("");
			return;
		}
		setNotice(errorText(error.code, error.message, status));
	}

	async function createPasskey() {
		const { error } = await authClient.passkey.addPasskey();
		if (error) return;
		await navigate({ to: "/hoy" });
	}

	async function continueOn() {
		await navigate({ to: "/hoy" });
	}

	if (phase === "passkey") {
		return (
			<main>
				<h1>¿Creas tu llave en este equipo?</h1>
				<button type="button" onClick={() => void createPasskey()}>
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
			<h1>Entrar</h1>
			{canPasskey ? (
				<button type="button" onClick={() => void signInWithPasskey()}>
					Entrar con mi llave
				</button>
			) : (
				<p>Usa el código</p>
			)}
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (phase === "code") void verify();
					else void requestCode();
				}}
			>
				{phase === "code" ? (
					<button type="submit" disabled={sending || code.length !== 6}>
						Continuar
					</button>
				) : (
					<button type="submit" disabled={sending || waiting || email.trim() === ""}>
						Recibir código por correo
					</button>
				)}
				<label>
					Correo
					<input
						type="email"
						value={email}
						autoComplete="username webauthn"
						onChange={(event) => setEmail(event.target.value)}
					/>
				</label>
				{phase === "code" ? (
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
				) : null}
				{alertText ? (
					<p className="aviso" role="alert">
						{alertText}
					</p>
				) : null}
				{phase === "code" ? (
					waiting && waitUntil ? (
						<p>Reenviar en {clock(waitUntil, now)}</p>
					) : (
						<button type="button" className="enlace" onClick={() => void requestCode()}>
							Reenviar
						</button>
					)
				) : null}
			</form>
			{phase === "code" ? (
				<Link to="/crear-cuenta">¿Aún no tienes cuenta? Crear cuenta</Link>
			) : null}
		</main>
	);
}
