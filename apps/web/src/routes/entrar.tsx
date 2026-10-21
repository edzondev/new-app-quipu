import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";

const CLAVE = "quipu-entrar";

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

	useEffect(() => {
		// sessionStorage no existe al renderizar en el servidor.
		// oxlint-disable-next-line react/set-state-in-effect
		setEsperaHasta(leerEspera());
	}, []);

	useEffect(() => {
		if (!esperaHasta || esperaHasta <= Date.now()) return;
		const id = setInterval(() => setAhora(Date.now()), 1000);
		return () => clearInterval(id);
	}, [esperaHasta]);

	const esperando = esperaHasta !== null && esperaHasta > ahora;

	async function entrarConLlave() {
		setAviso("");
		const { error } = await authClient.signIn.passkey();
		if (!error) {
			await navigate({ to: "/hoy" });
			return;
		}
		const code = "code" in error ? error.code : undefined;
		if (code === "ERROR_CEREMONY_ABORTED" || code === "AUTH_CANCELLED") return;
		setAviso("No pudimos usar tu llave. Prueba con un código al correo.");
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
		if (error?.code === "EMAIL_NOT_ALLOWED") {
			setAviso("No podemos registrar cuentas con ese dominio de correo.");
			return;
		}
		if (error) {
			setAviso("No pudimos completar eso. Intenta de nuevo.");
			return;
		}
		const hasta = Date.now() + 90_000;
		sessionStorage.setItem(CLAVE, String(hasta));
		setEsperaHasta(hasta);
		setFase("codigo");
		setAviso("Si este correo tiene cuenta, te llegó un código.");
	}

	async function verificar() {
		if (enviando) return;
		setEnviando(true);
		const { error } = await authClient.signIn.emailOtp({
			email: correo.trim().toLowerCase(),
			otp: codigo,
		});
		setEnviando(false);
		if (error?.code === "OTP_EXPIRED") {
			setAviso("Este código venció. Pide otro.");
			return;
		}
		if (error?.code === "TOO_MANY_ATTEMPTS") {
			setAviso("Te equivocaste 3 veces. Pide un código nuevo.");
			return;
		}
		if (error) {
			setAviso("El código no coincide.");
			return;
		}
		setAviso("");
		setFase("llave");
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
			<button type="button" onClick={() => void entrarConLlave()}>
				Entrar con mi llave
			</button>
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
				{aviso ? <p className="aviso">{aviso}</p> : null}
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
