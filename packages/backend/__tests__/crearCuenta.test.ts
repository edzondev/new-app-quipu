import { expect, test } from "vitest";
import { borradorVacio, cuentaYaExistia, leerBorrador } from "../shared/crearCuenta";

const ahora = 1_700_000_000_000;

test("un nombre que no es texto no rompe el borrador", () => {
	expect(leerBorrador('{"nombre":5}', ahora)).toEqual(borradorVacio);
	expect(leerBorrador('{"nombre":5,"correo":1,"fase":"codigo"}', ahora)).toEqual({
		...borradorVacio,
		fase: "codigo",
	});
});

test("el borrador válido se conserva y el inválido se vacía", () => {
	const espera = ahora + 1000;
	expect(
		leerBorrador(
			JSON.stringify({
				nombre: "Ana",
				correo: "ana@correo.com",
				fase: "llave",
				esperaHasta: espera,
			}),
			ahora,
		),
	).toEqual({
		nombre: "Ana",
		correo: "ana@correo.com",
		fase: "llave",
		esperaHasta: espera,
	});
	expect(leerBorrador("no-json", ahora)).toEqual(borradorVacio);
	expect(leerBorrador("[1]", ahora)).toEqual(borradorVacio);
	expect(leerBorrador("null", ahora)).toEqual(borradorVacio);
	expect(
		leerBorrador(JSON.stringify({ fase: "ya-existia", esperaHasta: ahora - 1 }), ahora),
	).toEqual(borradorVacio);
});

test("ya tenías cuenta compara dos horas del servidor", () => {
	const creado = "2000-01-01T00:00:00.000Z";
	expect(cuentaYaExistia(creado, "2000-01-01T03:00:01.000Z")).toBe(true);
	expect(cuentaYaExistia(creado, "2000-01-01T01:00:00.000Z")).toBe(false);
	expect(cuentaYaExistia(creado, creado)).toBe(false);
	expect(cuentaYaExistia(creado, undefined)).toBe(false);
});
