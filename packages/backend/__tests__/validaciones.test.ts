import { expect, test } from "vitest";
import {
	borradorDeCrearCuenta,
	correo,
	diaDeCobro,
	fechaEnMs,
	nombre,
	segundosDeEspera,
	sueldoEnCentimos,
} from "../shared/validaciones";

const ahora = 1_700_000_000_000;

test("el correo queda sin espacios, en minúscula y con forma de correo", () => {
	expect(correo.parse("ana@correo.com")).toBe("ana@correo.com");
	expect(correo.parse("  A@B.COM ")).toBe("a@b.com");
	expect(correo.safeParse("").success).toBe(false);
	expect(correo.safeParse("no-es-correo").success).toBe(false);
	expect(correo.safeParse("a@b").success).toBe(false);
	expect(correo.safeParse("a @b.com").success).toBe(false);
});

test("el nombre queda sin espacios de más y no vacío", () => {
	expect(nombre.parse("Ana")).toBe("Ana");
	expect(nombre.parse("  Ana María  ")).toBe("Ana María");
	expect(nombre.safeParse("").success).toBe(false);
	expect(nombre.safeParse("   ").success).toBe(false);
});

test("el sueldo en céntimos es un entero desde cero", () => {
	expect(sueldoEnCentimos.parse(0)).toBe(0);
	expect(sueldoEnCentimos.parse(4230)).toBe(4230);
	expect(sueldoEnCentimos.safeParse(-1).success).toBe(false);
	expect(sueldoEnCentimos.safeParse(1.5).success).toBe(false);
	expect(sueldoEnCentimos.safeParse(12.75).success).toBe(false);
});

test("el día de cobro es un entero del 1 al 31", () => {
	expect(diaDeCobro.parse(1)).toBe(1);
	expect(diaDeCobro.parse(31)).toBe(31);
	expect(diaDeCobro.safeParse(0).success).toBe(false);
	expect(diaDeCobro.safeParse(32).success).toBe(false);
	expect(diaDeCobro.safeParse(1.5).success).toBe(false);
});

test("los segundos de espera son un número finito", () => {
	expect(segundosDeEspera.parse("65")).toBe(65);
	expect(segundosDeEspera.parse("0")).toBe(0);
	expect(segundosDeEspera.parse("  65  ")).toBe(65);
	expect(segundosDeEspera.parse("")).toBe(0);
	expect(segundosDeEspera.safeParse("abc").success).toBe(false);
	expect(segundosDeEspera.safeParse("Infinity").success).toBe(false);
	expect(segundosDeEspera.safeParse(undefined).success).toBe(false);
});

test("un campo malo del borrador cae a su valor por defecto", () => {
	const esquema = borradorDeCrearCuenta(ahora);
	expect(
		esquema.parse({
			nombre: "Ana",
			correo: "ana@correo.com",
			fase: "llave",
			esperaHasta: ahora + 1000,
		}),
	).toEqual({
		nombre: "Ana",
		correo: "ana@correo.com",
		fase: "llave",
		esperaHasta: ahora + 1000,
	});
	expect(esquema.parse({ nombre: 5, correo: 1, fase: "codigo" })).toEqual({
		nombre: "",
		correo: "",
		fase: "codigo",
		esperaHasta: null,
	});
	expect(esquema.parse({ fase: "ya-existia", esperaHasta: ahora - 1 })).toEqual({
		nombre: "",
		correo: "",
		fase: "datos",
		esperaHasta: null,
	});
	expect(esquema.parse({ esperaHasta: 0 }).esperaHasta).toBe(null);
	expect(esquema.parse({ esperaHasta: 1.5 }).esperaHasta).toBe(null);
	expect(esquema.parse({ esperaHasta: ahora }).esperaHasta).toBe(null);
	expect(esquema.parse({ esperaHasta: Number.NaN }).esperaHasta).toBe(null);
	expect(esquema.safeParse("").success).toBe(false);
	expect(esquema.safeParse([1]).success).toBe(false);
	expect(esquema.safeParse(null).success).toBe(false);
	expect(
		esquema.parse({
			nombre: "  Ana  ",
			correo: "  A@B.COM ",
			fase: "datos",
			esperaHasta: null,
		}),
	).toEqual({
		nombre: "  Ana  ",
		correo: "  A@B.COM ",
		fase: "datos",
		esperaHasta: null,
	});
});

test("la fecha en milisegundos sale de un número, un texto o una Date", () => {
	const iso = "2000-01-01T00:00:00.000Z";
	expect(fechaEnMs.parse(ahora)).toBe(ahora);
	expect(fechaEnMs.parse(0)).toBe(0);
	expect(fechaEnMs.parse(iso)).toBe(Date.parse(iso));
	expect(fechaEnMs.parse(new Date(ahora))).toBe(ahora);
	expect(fechaEnMs.safeParse("").success).toBe(false);
	expect(fechaEnMs.safeParse("no-es-fecha").success).toBe(false);
	expect(fechaEnMs.safeParse(undefined).success).toBe(false);
	expect(fechaEnMs.safeParse(Number.NaN).success).toBe(false);
	expect(fechaEnMs.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
	expect(fechaEnMs.safeParse(1.5).success).toBe(true);
});
