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
