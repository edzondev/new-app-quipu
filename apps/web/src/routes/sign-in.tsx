import { authMessages, errorText, waitNotice } from "@quipu/backend/shared/authMessages.ts";
import { waitSeconds } from "@quipu/backend/shared/validation.ts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";

// shortcut: 90s matches codeEvery90s, change both if the limit changes.
const RESEND_SECONDS = 90;

function browserSupportsWebAuthn() {
	return (
		globalThis.PublicKeyCredential !== undefined &&
		typeof globalThis.PublicKeyCredential === "function"
	);
}

function ResendCountdown({ seconds, onDone }: { seconds: number; onDone: () => void }) {
	const [left, setLeft] = useState(seconds);
	useEffect(() => {
		if (left <= 0) {
			onDone();
			return;
		}
		const id = setTimeout(() => setLeft(left - 1), 1000);
		return () => clearTimeout(id);
	}, [left, onDone]);
	return <p>{waitNotice(left)}</p>;
}

export const Route = createFileRoute("/sign-in")({ component: SignIn });

function SignIn() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [phase, setPhase] = useState<"email" | "code" | "passkey">("email");
	const [notice, setNotice] = useState("");
	const [sending, setSending] = useState(false);
	const [resendIn, setResendIn] = useState<number | null>(null);
	const [canPasskey, setCanPasskey] = useState(false);
	const clearWait = useCallback(() => setResendIn(null), []);

	useEffect(() => {
		// PublicKeyCredential does not exist during server render.
		// oxlint-disable-next-line react/set-state-in-effect
		setCanPasskey(browserSupportsWebAuthn());
	}, []);

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

	function startWait(seconds: number) {
		setResendIn(seconds);
		setPhase("code");
	}

	async function requestCode() {
		if (sending || resendIn !== null) return;
		setSending(true);
		setNotice("");
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
		});
		setSending(false);
		if (error?.code === "WAIT_TO_RESEND") {
			const seconds = waitSeconds.safeParse(error.message);
			if (seconds.success) startWait(seconds.data);
			else
				setNotice(
					errorText(error.code, error.message, "status" in error ? error.status : undefined),
				);
			return;
		}
		if (error) {
			setNotice(errorText(error.code, error.message, "status" in error ? error.status : undefined));
			return;
		}
		startWait(RESEND_SECONDS);
	}

	async function verify() {
		if (sending) return;
		setSending(true);
		const { error } = await authClient.signIn.emailOtp({ email, otp: code });
		setSending(false);
		if (!error) {
			setNotice("");
			setPhase("passkey");
			return;
		}
		const status = "status" in error ? error.status : undefined;
		const seconds = waitSeconds.safeParse(error.message);
		if ((error.code === "WAIT_TO_RESEND" || status === 429) && seconds.success) {
			setResendIn(seconds.data);
			setNotice("");
			return;
		}
		setNotice(errorText(error.code, error.message, status));
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
		await navigate({ to: "/hoy" });
	}

	if (phase === "passkey") {
		return (
			<main>
				<h1>¿Creas tu llave en este equipo?</h1>
				{notice ? (
					<p className="aviso" role="alert">
						{notice}
					</p>
				) : null}
				<button type="button" disabled={sending} onClick={() => void createPasskey()}>
					Crear mi llave
				</button>
				<button type="button" className="clara" onClick={() => void navigate({ to: "/hoy" })}>
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
							onChange={(event) => setCode(event.target.value)}
						/>
					</label>
				) : null}
				{notice ? (
					<p className="aviso" role="alert">
						{notice}
					</p>
				) : null}
				{phase === "code" ? <p>{authMessages.CODE_DURATION}</p> : null}
				<button type="submit" disabled={sending}>
					{phase === "code" ? "Continuar" : "Recibir código por correo"}
				</button>
				{phase === "code" ? (
					resendIn !== null ? (
						<ResendCountdown key={resendIn} seconds={resendIn} onDone={clearWait} />
					) : (
						<button
							type="button"
							className="enlace"
							disabled={sending}
							onClick={() => void requestCode()}
						>
							Reenviar
						</button>
					)
				) : null}
			</form>
		</main>
	);
}
