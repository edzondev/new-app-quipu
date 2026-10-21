import { HOUR, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const limitador = new RateLimiter(components.rateLimiter, {
	codigoCada90s: { kind: "token bucket", rate: 1, period: 90 * SECOND, capacity: 1 },
	codigosPorHora: { kind: "fixed window", rate: 6, period: HOUR },
});

export const reservarEnvioDeCodigo = internalMutation({
	args: { email: v.string() },
	returns: v.object({ ok: v.boolean(), esperaMs: v.number() }),
	handler: async (ctx, { email }) => {
		const hora = await limitador.check(ctx, "codigosPorHora", { key: email });
		if (!hora.ok) return { ok: false, esperaMs: hora.retryAfter };
		const corto = await limitador.limit(ctx, "codigoCada90s", { key: email });
		if (!corto.ok) return { ok: false, esperaMs: corto.retryAfter };
		await limitador.limit(ctx, "codigosPorHora", { key: email });
		return { ok: true, esperaMs: 0 };
	},
});
