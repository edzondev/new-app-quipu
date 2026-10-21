import { mensajesAuth, textoDelError } from "@quipu/backend/shared/mensajesAuth.ts";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";

const CLAVE = "quipu-entrar";

function browserSupportsWebAuthn() {
	return (
		globalThis.PublicKeyCredential !== undefined &&
		typeof globalThis.PublicKeyCredential === "function"
	);
}

function reloj(hasta: number, ahora: number) {
	const segundos = Math.max(0, Math.ceil((hasta - ahora) / 1000));
	const minutos = Math.floor(segundos / 60);
	const resto = segundos % 60;
	return `${minutos}:${resto.toString().padStart(2, "0")}`;
}

function leerEspera() {
	const hasta = Number(sessionStorage.getItem(CLAVE) ?? 0);
	return hasta > Date.now() ? hasta : null;
}

export const Route = createFileRoute("/entrar")({ component: Entrar });

function Entrar() {
	const navigate = useNavigate();
	const [correo, setCorreo] = useState("");
	const [codigo, setCodigo] = useState("");
	const [fase, setFase] = useState<"elegir" | "codigo" | "llave">("elegir");
	const [aviso, setAviso] = useState("");
	const [enviando, setEnviando] = useState(false);
	const [esperaHasta, setEsperaHasta] = useState<number | null>(null);
	const [ahora, setAhora] = useState(() => Date.now());
	const [puedeLlave, setPuedeLlave] = useState(false);

	useEffect(() => {
		// sessionStorage y PublicKeyCredential no existen al renderizar en el servidor.
		// oxlint-disable-next-line react/set-state-in-effect
		setEsperaHasta(leerEspera());
		// oxlint-disable-next-line react/set-state-in-effect
		setPuedeLlave(browserSupportsWebAuthn());
	}, []);

	useEffect(() => {
		if (!esperaHasta || esperaHasta <= Date.now()) return;
		const id = setInterval(() => setAhora(Date.now()), 1000);
		return () => clearInterval(id);
	}, [esperaHasta]);

	const esperando = esperaHasta !== null && esperaHasta > ahora;
	const textoEspera =
		esperando && esperaHasta ? `Podrás pedir otro código en ${reloj(esperaHasta, ahora)}` : "";
	const textoAviso = aviso || textoEspera;

	async function entrarConLlave() {
		setAviso("");
		const { error } = await authClient.signIn.passkey();
		if (!error) {
			await navigate({ to: "/hoy" });
			return;
		}
		const code = "code" in error ? error.code : undefined;
		if (
			code === "ERROR_CEREMONY_ABORTED" ||
			code === "AUTH_CANCELLED" ||
			code === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY"
		) {
			return;
		}
		setAviso(mensajesAuth.LLAVE);
	}

	async function pedirCodigo() {
		if (enviando || esperando) return;
		const email = correo.trim().toLowerCase();
		setEnviando(true);
		setAviso("");
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
			fetchOptions: { headers: { "x-quipu-intencion": "entrar" } },
		});
		setEnviando(false);
		if (error?.code === "ESPERA_REENVIO") {
			const segundos = Number(error.message);
			const hasta = Date.now() + (Number.isFinite(segundos) ? segundos * 1000 : 90_000);
			sessionStorage.setItem(CLAVE, String(hasta));
			setEsperaHasta(hasta);
			setFase("codigo");
			return;
		}
		if (error) {
			setAviso(
				textoDelError(error.code, error.message, "status" in error ? error.status : undefined),
			);
			return;
		}
		const hasta = Date.now() + 90_000;
		sessionStorage.setItem(CLAVE, String(hasta));
		setEsperaHasta(hasta);
		setFase("codigo");
		setAviso(textoDelError("CODIGO_SI_HAY_CUENTA"));
	}

	async function verificar() {
		if (enviando) return;
		setEnviando(true);
		const { error } = await authClient.signIn.emailOtp({
			email: correo.trim().toLowerCase(),
			otp: codigo,
		});
		setEnviando(false);
		if (!error) {
			setAviso("");
			setFase("llave");
			return;
		}
		const status = "status" in error ? error.status : undefined;
		const segundos = Number(error.message);
		if ((error.code === "ESPERA_REENVIO" || status === 429) && Number.isFinite(segundos)) {
			const hasta = Date.now() + segundos * 1000;
			sessionStorage.setItem(CLAVE, String(hasta));
			setEsperaHasta(hasta);
			setAviso("");
			return;
		}
		setAviso(textoDelError(error.code, error.message, status));
	}

	async function crearLlave() {
		const { error } = await authClient.passkey.addPasskey();
		if (error) return;
		await navigate({ to: "/hoy" });
	}

	async function seguir() {
		await navigate({ to: "/hoy" });
	}

	if (fase === "llave") {
		return (
			<main>
				<h1>¿Creas tu llave en este equipo?</h1>
				<button type="button" onClick={() => void crearLlave()}>
					Crear mi llave
				</button>
				<button type="button" className="clara" onClick={() => void seguir()}>
					Ahora no
				</button>
			</main>
		);
	}

	return (
		<main>
			<h1>Entrar</h1>
			{puedeLlave ? (
				<button type="button" onClick={() => void entrarConLlave()}>
					Entrar con mi llave
				</button>
			) : (
				<p>Usa el código</p>
			)}
			<form
				onSubmit={(evento) => {
					evento.preventDefault();
					if (fase === "codigo") void verificar();
					else void pedirCodigo();
				}}
			>
				{fase === "codigo" ? (
					<button type="submit" disabled={enviando || codigo.length !== 6}>
						Continuar
					</button>
				) : (
					<button type="submit" disabled={enviando || esperando || correo.trim() === ""}>
						Recibir código por correo
					</button>
				)}
				<label>
					Correo
					<input
						type="email"
						value={correo}
						autoComplete="username webauthn"
						onChange={(evento) => setCorreo(evento.target.value)}
					/>
				</label>
				{fase === "codigo" ? (
					<label>
						Código
						<input
							value={codigo}
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={6}
							onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 6))}
						/>
					</label>
				) : null}
				{textoAviso ? (
					<p className="aviso" role="alert">
						{textoAviso}
					</p>
				) : null}
				{fase === "codigo" ? (
					esperando && esperaHasta ? (
						<p>Reenviar en {reloj(esperaHasta, ahora)}</p>
					) : (
						<button type="button" className="enlace" onClick={() => void pedirCodigo()}>
							Reenviar
						</button>
					)
				) : null}
			</form>
			{fase === "codigo" ? (
				<Link to="/crear-cuenta">¿Aún no tienes cuenta? Crear cuenta</Link>
			) : null}
		</main>
	);
}
