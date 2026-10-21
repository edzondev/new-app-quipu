import * as z from "zod/mini";

export const correo = z.pipe(z.string().check(z.trim(), z.toLowerCase()), z.email());
export type Correo = z.infer<typeof correo>;

export const nombre = z.pipe(z.string().check(z.trim()), z.string().check(z.minLength(1)));
export type Nombre = z.infer<typeof nombre>;

export const sueldoEnCentimos = z.int().check(z.minimum(0));
export type SueldoEnCentimos = z.infer<typeof sueldoEnCentimos>;

export const diaDeCobro = z.int().check(z.minimum(1), z.maximum(31));
export type DiaDeCobro = z.infer<typeof diaDeCobro>;

export const segundosDeEspera = z.coerce.number();
export type SegundosDeEspera = z.infer<typeof segundosDeEspera>;

export const fechaEnMs = z.pipe(
	z.union([
		z.number(),
		z.pipe(
			z.string(),
			z.transform((texto) => new Date(texto).getTime()),
		),
		z.pipe(
			z.date(),
			z.transform((fecha) => fecha.getTime()),
		),
	]),
	z.number(),
);
export type FechaEnMs = z.infer<typeof fechaEnMs>;

export const fase = z.union([
	z.literal("datos"),
	z.literal("codigo"),
	z.literal("llave"),
	z.literal("ya-existia"),
]);
export type Fase = z.infer<typeof fase>;

export const borrador = z.object({
	nombre: z.string(),
	correo: z.string(),
	fase,
	esperaHasta: z.nullable(z.number()),
});
export type Borrador = z.infer<typeof borrador>;

const faseLeida = z.catch(
	z.union([z.literal("datos"), z.literal("codigo"), z.literal("llave")]),
	"datos",
);

export function borradorDeCrearCuenta(ahora: number) {
	return z.object({
		nombre: z.catch(z.string(), ""),
		correo: z.catch(z.string(), ""),
		fase: faseLeida,
		esperaHasta: z.catch(z.nullable(z.number().check(z.gt(ahora))), null),
	});
}
