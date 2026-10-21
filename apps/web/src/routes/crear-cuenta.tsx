import {
	type Borrador,
	borradorVacio,
	cuentaYaExistia,
	leerBorrador,
} from "@quipu/backend/shared/crearCuenta.ts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";

const CLAVE = "quipu-crear";

function guardarBorrador(borrador: Borrador) {
	sessionStorage.setItem(CLAVE, JSON.stringify(borrador));
}

function reloj(hasta: number, ahora: number) {
	const segundos = Math.max(0, Math.ceil((hasta - ahora) / 1000));
	const minutos = Math.floor(segundos / 60);
	const resto = segundos % 60;
	return `${minutos}:${resto.toString().padStart(2, "0")}`;
}

function textoDelError(code: string | undefined, message: string | undefined) {
	if (code === "INVALID_OTP") return "El código no coincide.";
	if (code === "OTP_EXPIRED") return "Este código venció. Pide otro.";
	if (code === "TOO_MANY_ATTEMPTS") return "Te equivocaste 3 veces. Pide un código nuevo.";
	if (code === "EMAIL_NOT_ALLOWED")
		return "No podemos registrar cuentas con ese dominio de correo.";
	if (code === "ESPERA_REENVIO") {
		const segundos = Number(message);
		if (Number.isFinite(segundos))
			return `Podrás pedir otro código en ${reloj(segundos * 1000, 0)}`;
		return "Podrás pedir otro código en un momento.";
	}
	return "No pudimos completar eso. Intenta de nuevo.";
}

export const Route = createFileRoute("/crear-cuenta")({ component: CrearCuenta });

function CrearCuenta() {
	const navigate = useNavigate();
	const [borrador, setBorrador] = useState<Borrador>(borradorVacio);
	const [codigo, setCodigo] = useState("");
	const [aviso, setAviso] = useState("");
	const [enviando, setEnviando] = useState(false);
	const [ahora, setAhora] = useState(() => Date.now());

	useEffect(() => {
		// sessionStorage no existe al renderizar en el servidor.
		// oxlint-disable-next-line react/set-state-in-effect
		setBorrador(leerBorrador(sessionStorage.getItem(CLAVE), Date.now()));
	}, []);

	useEffect(() => {
		if (!borrador.esperaHasta || borrador.esperaHasta <= Date.now()) return;
		const id = setInterval(() => setAhora(Date.now()), 1000);
		return () => clearInterval(id);
	}, [borrador.esperaHasta]);

	function actualizar(siguiente: Borrador) {
		setBorrador(siguiente);
		guardarBorrador(siguiente);
	}

	const esperando = borrador.esperaHasta !== null && borrador.esperaHasta > ahora;

	async function pedirCodigo() {
		if (enviando || esperando) return;
		const correo = borrador.correo.trim().toLowerCase();
		setEnviando(true);
		setAviso("");
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email: correo,
			type: "sign-in",
			fetchOptions: { headers: { "x-quipu-intencion": "crear" } },
		});
		setEnviando(false);
		if (error) {
			if (error.code === "ESPERA_REENVIO") {
				const segundos = Number(error.message);
				const hasta = Date.now() + (Number.isFinite(segundos) ? segundos * 1000 : 90_000);
				actualizar({ ...borrador, correo, fase: "codigo", esperaHasta: hasta });
				setAviso("");
				return;
			}
			setAviso(textoDelError(error.code, error.message));
			return;
		}
		actualizar({ ...borrador, correo, fase: "codigo", esperaHasta: Date.now() + 90_000 });
	}

	async function verificar() {
		if (enviando) return;
		setEnviando(true);
		setAviso("");
		const { data, error } = await authClient.signIn.emailOtp({
			email: borrador.correo.trim().toLowerCase(),
			otp: codigo,
			name: borrador.nombre.trim(),
		});
		setEnviando(false);
		if (error || !data?.user) {
			setAviso(textoDelError(error?.code, error?.message));
			return;
		}
		const sesion = await authClient.getSession();
		if (cuentaYaExistia(data.user.createdAt, sesion.data?.session.createdAt)) {
			actualizar({ ...borrador, fase: "ya-existia", esperaHasta: null });
			return;
		}
		actualizar({ ...borrador, fase: "llave", esperaHasta: null });
	}

	async function crearLlave() {
		const { error } = await authClient.passkey.addPasskey();
		if (error) {
			setAviso("No pudimos crear la llave.");
			return;
		}
		sessionStorage.removeItem(CLAVE);
		await navigate({ to: "/hoy" });
	}

	async function seguir() {
		sessionStorage.removeItem(CLAVE);
		await navigate({ to: "/hoy" });
	}

	const textoEspera =
		esperando && borrador.esperaHasta
			? `Podrás pedir otro código en ${reloj(borrador.esperaHasta, ahora)}`
			: "";
	const textoAviso = textoEspera || aviso;

	if (borrador.fase === "ya-existia") {
		return (
			<main>
				<p>Ya tenías una cuenta con este correo. Entraste a ella.</p>
				<button type="button" onClick={() => void seguir()}>
					Seguir
				</button>
			</main>
		);
	}

	if (borrador.fase === "llave") {
		return (
			<main>
				<h1>¿Creas tu llave en este equipo?</h1>
				{textoAviso ? (
					<p className="aviso" role="alert">
						{textoAviso}
					</p>
				) : null}
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
			<h1>Crear cuenta</h1>
			{borrador.fase === "datos" ? (
				<form
					onSubmit={(evento) => {
						evento.preventDefault();
						void pedirCodigo();
					}}
				>
					<label>
						Nombre
						<input
							value={borrador.nombre}
							autoComplete="name"
							onChange={(evento) => actualizar({ ...borrador, nombre: evento.target.value })}
						/>
					</label>
					<label>
						Correo
						<input
							type="email"
							value={borrador.correo}
							autoComplete="email"
							onChange={(evento) => actualizar({ ...borrador, correo: evento.target.value })}
						/>
					</label>
					{textoAviso ? (
						<p className="aviso" role="alert">
							{textoAviso}
						</p>
					) : null}
					<button type="submit" disabled={enviando || esperando || borrador.nombre.trim() === ""}>
						{esperando && borrador.esperaHasta
							? `Reenviar en ${reloj(borrador.esperaHasta, ahora)}`
							: "Continuar"}
					</button>
				</form>
			) : (
				<form
					onSubmit={(evento) => {
						evento.preventDefault();
						void verificar();
					}}
				>
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
					{textoAviso ? (
						<p className="aviso" role="alert">
							{textoAviso}
						</p>
					) : null}
					<p>El código dura 10 minutos.</p>
					<button type="submit" disabled={enviando || codigo.length !== 6}>
						Continuar
					</button>
					{esperando && borrador.esperaHasta ? (
						<p>Reenviar en {reloj(borrador.esperaHasta, ahora)}</p>
					) : (
						<button type="button" className="enlace" onClick={() => void pedirCodigo()}>
							Reenviar
						</button>
					)}
				</form>
			)}
		</main>
	);
}
