import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import schema from "../convex/betterAuth/schema";
import { convexTest } from "convex-test";
import { defineSchema } from "convex/server";
import { expect, test } from "vitest";

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");

test("crear una llave pide sesión", async () => {
	const t = convexTest(defineSchema({}), modules);
	t.registerComponent("betterAuth", schema, componentModules);
	resendTest.register(t);
	rateLimiterTest.register(t);
	const respuesta = await t.fetch("/api/auth/passkey/generate-register-options", {
		method: "GET",
		headers: { origin: "http://localhost:3000" },
	});
	expect(respuesta.status).not.toBe(404);
	expect(respuesta.ok).toBe(false);
});
