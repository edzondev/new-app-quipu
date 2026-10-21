import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	perfiles: defineTable({
		userId: v.string(),
		nombre: v.string(),
		pasoActual: v.union(
			v.literal("paso-1"),
			v.literal("paso-2"),
			v.literal("paso-3"),
			v.literal("listo"),
		),
		borradorSueldoCentimos: v.optional(v.number()),
		borradorDiaDeCobro: v.optional(v.number()),
		creadoEn: v.number(),
	}).index("by_userId", ["userId"]),
});
