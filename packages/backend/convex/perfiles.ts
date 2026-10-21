import type { GenericCtx } from "@convex-dev/better-auth";
import { ConvexError, v } from "convex/values";
import { diaDeCobro, sueldoEnCentimos } from "../shared/validaciones";
import { authComponent } from "./auth";
import type { DataModel } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const paso = v.union(
	v.literal("paso-1"),
	v.literal("paso-2"),
	v.literal("paso-3"),
	v.literal("listo"),
);

const perfil = v.object({
	userId: v.string(),
	nombre: v.string(),
	pasoActual: paso,
	borradorSueldoCentimos: v.optional(v.number()),
	borradorDiaDeCobro: v.optional(v.number()),
	creadoEn: v.number(),
});

async function ensureUsuario(ctx: GenericCtx<DataModel>) {
	return await authComponent.safeGetAuthUser(ctx);
}

async function requireUsuario(ctx: GenericCtx<DataModel>) {
	return await authComponent.getAuthUser(ctx);
}

export const miPerfil = query({
	args: {},
	returns: v.union(perfil, v.null()),
	handler: async (ctx) => {
		const usuario = await ensureUsuario(ctx);
		if (!usuario) return null;
		const fila = await ctx.db
			.query("perfiles")
			.withIndex("by_userId", (q) => q.eq("userId", usuario._id))
			.unique();
		if (!fila) return null;
		return {
			userId: fila.userId,
			nombre: fila.nombre,
			pasoActual: fila.pasoActual,
			creadoEn: fila.creadoEn,
			...(fila.borradorSueldoCentimos !== undefined
				? { borradorSueldoCentimos: fila.borradorSueldoCentimos }
				: {}),
			...(fila.borradorDiaDeCobro !== undefined
				? { borradorDiaDeCobro: fila.borradorDiaDeCobro }
				: {}),
		};
	},
});

export const guardarPrimerosPasos = mutation({
	args: {
		paso,
		borradorSueldoCentimos: v.optional(v.number()),
		borradorDiaDeCobro: v.optional(v.number()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const usuario = await requireUsuario(ctx);
		const fila = await ctx.db
			.query("perfiles")
			.withIndex("by_userId", (q) => q.eq("userId", usuario._id))
			.unique();
		if (!fila) throw new ConvexError("Sin perfil");
		if (
			(args.borradorSueldoCentimos !== undefined &&
				!sueldoEnCentimos.safeParse(args.borradorSueldoCentimos).success) ||
			(args.borradorDiaDeCobro !== undefined &&
				!diaDeCobro.safeParse(args.borradorDiaDeCobro).success)
		) {
			throw new ConvexError("Esos datos no sirven.");
		}
		await ctx.db.patch("perfiles", fila._id, {
			pasoActual: args.paso,
			...(args.borradorSueldoCentimos !== undefined
				? { borradorSueldoCentimos: args.borradorSueldoCentimos }
				: {}),
			...(args.borradorDiaDeCobro !== undefined
				? { borradorDiaDeCobro: args.borradorDiaDeCobro }
				: {}),
		});
		return null;
	},
});
