import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

test("el segundo código antes de 90 s se rechaza; a los 90 s se permite", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		const t = convexTest(schema, modules);
		rateLimiterTest.register(t);
		const email = "ana@correo.com";
		expect((await t.mutation(internal.limites.reservarEnvioDeCodigo, { email })).ok).toBe(true);
		expect((await t.mutation(internal.limites.reservarEnvioDeCodigo, { email })).ok).toBe(false);
		vi.advanceTimersByTime(90_000);
		expect((await t.mutation(internal.limites.reservarEnvioDeCodigo, { email })).ok).toBe(true);
	} finally {
		vi.useRealTimers();
	}
});

test("el séptimo código en una hora se rechaza", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		const t = convexTest(schema, modules);
		rateLimiterTest.register(t);
		const email = "ana@correo.com";
		let esperaDeLaHora = 0;
		for (let envio = 0; envio < 13; envio++) {
			const reserva = await t.mutation(internal.limites.reservarEnvioDeCodigo, { email });
			if (!reserva.ok && reserva.esperaMs > 90_000) {
				esperaDeLaHora = reserva.esperaMs;
				break;
			}
			expect(reserva.ok).toBe(true);
			vi.advanceTimersByTime(90_000);
		}
		expect(esperaDeLaHora).toBeGreaterThan(90_000);
		vi.advanceTimersByTime(esperaDeLaHora + 1);
		for (let envio = 0; envio < 6; envio++) {
			expect((await t.mutation(internal.limites.reservarEnvioDeCodigo, { email })).ok).toBe(true);
			vi.advanceTimersByTime(90_000);
		}
		const septimo = await t.mutation(internal.limites.reservarEnvioDeCodigo, { email });
		expect(septimo.ok).toBe(false);
		expect(septimo.esperaMs).toBeGreaterThan(90_000);
	} finally {
		vi.useRealTimers();
	}
});
