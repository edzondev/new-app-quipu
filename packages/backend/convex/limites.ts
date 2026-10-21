import { HOUR, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const limitador = new RateLimiter(components.rateLimiter, {
	codigoCada90s: { kind: "token bucket", rate: 1, period: 90 * SECOND, capacity: 1 },
	codigosPorHora: { kind: "fixed window", rate: 6, period: HOUR },
});

type Reserva = {
	ok: boolean;
	esperaMs: number;
	limite: "90s" | "hora" | null;
};

function rechazo(esperaMs: number, limite: "90s" | "hora"): Reserva {
	return { ok: false, esperaMs, limite };
}

export const reservarEnvioDeCodigo = internalMutation({
	args: { email: v.string() },
	returns: v.object({
		ok: v.boolean(),
		esperaMs: v.number(),
		limite: v.union(v.literal("90s"), v.literal("hora"), v.null()),
	}),
	handler: async (ctx, { email }): Promise<Reserva> => {
		const hora = await limitador.check(ctx, "codigosPorHora", { key: email });
		if (!hora.ok) return rechazo(hora.retryAfter, "hora");
		const corto = await limitador.limit(ctx, "codigoCada90s", { key: email });
		if (!corto.ok) return rechazo(corto.retryAfter, "90s");
		await limitador.limit(ctx, "codigosPorHora", { key: email });
		return { ok: true, esperaMs: 0, limite: null };
	},
});
