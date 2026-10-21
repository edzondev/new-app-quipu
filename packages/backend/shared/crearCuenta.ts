export type Fase = "datos" | "codigo" | "llave" | "ya-existia";

export type Borrador = {
	nombre: string;
	correo: string;
	fase: Fase;
	esperaHasta: number | null;
};

export const borradorVacio: Borrador = {
	nombre: "",
	correo: "",
	fase: "datos",
	esperaHasta: null,
};

const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

function esRegistro(valor: unknown): valor is Record<string, unknown> {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function aMs(valor: unknown) {
	if (typeof valor === "number") return valor;
	if (typeof valor === "string" || valor instanceof Date) return new Date(valor).getTime();
	return Number.NaN;
}

export function leerBorrador(texto: string | null, ahora: number): Borrador {
	if (!texto) return borradorVacio;
	try {
		const guardado: unknown = JSON.parse(texto);
		if (!esRegistro(guardado)) return borradorVacio;
		const espera = guardado.esperaHasta;
		const esperaHasta =
			typeof espera === "number" && Number.isFinite(espera) && espera > ahora ? espera : null;
		const fase = guardado.fase === "codigo" || guardado.fase === "llave" ? guardado.fase : "datos";
		const nombre = typeof guardado.nombre === "string" ? guardado.nombre : "";
		const correo = typeof guardado.correo === "string" ? guardado.correo : "";
		return { nombre, correo, fase, esperaHasta };
	} catch {
		return borradorVacio;
	}
}

export function cuentaYaExistia(creadoEn: unknown, ahoraServidor: unknown) {
	const creado = aMs(creadoEn);
	const ahora = aMs(ahoraServidor);
	return Number.isFinite(creado) && Number.isFinite(ahora) && ahora - creado > DOS_HORAS_MS;
}
