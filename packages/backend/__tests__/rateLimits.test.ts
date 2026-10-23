import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

test("a second code before 90 s is rejected; after 90 s it is allowed", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		const t = convexTest(schema, modules);
		rateLimiterTest.register(t);
		const email = "ana@correo.com";
		expect(await t.mutation(internal.rateLimits.reserveCodeSend, { email })).toBeNull();
		const second = await t.mutation(internal.rateLimits.reserveCodeSend, { email });
		expect(second?.waitMs).toBeGreaterThan(0);
		vi.advanceTimersByTime(90_000);
		expect(await t.mutation(internal.rateLimits.reserveCodeSend, { email })).toBeNull();
	} finally {
		vi.useRealTimers();
	}
});

test("the seventh code in an hour is rejected", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		const t = convexTest(schema, modules);
		rateLimiterTest.register(t);
		const email = "ana@correo.com";
		let hourWait = 0;
		for (let send = 0; send < 13; send++) {
			const reservation = await t.mutation(internal.rateLimits.reserveCodeSend, { email });
			if (reservation) {
				hourWait = reservation.waitMs;
				break;
			}
			vi.advanceTimersByTime(90_000);
		}
		expect(hourWait).toBeGreaterThan(0);
		vi.advanceTimersByTime(hourWait + 1);
		for (let send = 0; send < 6; send++) {
			expect(await t.mutation(internal.rateLimits.reserveCodeSend, { email })).toBeNull();
			vi.advanceTimersByTime(90_000);
		}
		const seventh = await t.mutation(internal.rateLimits.reserveCodeSend, { email });
		expect(seventh?.waitMs).toBeGreaterThan(0);
	} finally {
		vi.useRealTimers();
	}
});
