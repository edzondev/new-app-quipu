import { type Borrador, borradorDeCrearCuenta, fechaEnMs } from "./validaciones";

export type { Borrador, Fase } from "./validaciones";

export const borradorVacio: Borrador = {
	nombre: "",
	correo: "",
	fase: "datos",
	esperaHasta: null,
};

const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

export function leerBorrador(texto: string | null, ahora: number): Borrador {
	if (!texto) return borradorVacio;
	try {
		const guardado: unknown = JSON.parse(texto);
		const leido = borradorDeCrearCuenta(ahora).safeParse(guardado);
		if (!leido.success) return borradorVacio;
		return leido.data;
	} catch {
		return borradorVacio;
	}
}

export function cuentaYaExistia(creadoEn: unknown, ahoraServidor: unknown) {
	const creado = fechaEnMs.safeParse(creadoEn);
	const ahora = fechaEnMs.safeParse(ahoraServidor);
	if (!creado.success || !ahora.success) return false;
	return ahora.data - creado.data > DOS_HORAS_MS;
}
