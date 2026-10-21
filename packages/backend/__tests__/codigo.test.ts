import type { GenericCtx } from "@convex-dev/better-auth";
import schema from "../convex/betterAuth/schema";
import { convexTest } from "convex-test";
import { componentsGeneric, defineSchema } from "convex/server";
import { expect, test } from "vitest";
import { createAuthOptions } from "../convex/auth";
import type { DataModel } from "../convex/_generated/dataModel";

test("entrar no usa contraseña", () => {
	const options = createAuthOptions({} as GenericCtx<DataModel>);
	expect(options.emailAndPassword.enabled).toBe(false);
	expect(options.plugins.map((plugin) => plugin.id)).toContain("email-otp");
});

test("el código busca una cuenta por correo y no encuentra una que no existe", async () => {
	const modules = import.meta.glob("../convex/**/*.ts");
	const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");
	// shortcut: el componente local no tiene _generated hasta codegen, y codegen pide un deployment.
	const ejemplo = Object.keys(componentModules)[0] ?? "";
	const raiz = ejemplo.replace(/[^/]+$/, "");
	const t = convexTest(defineSchema({}), modules);
	t.registerComponent("betterAuth", schema, {
		...componentModules,
		[`${raiz}_generated/api.ts`]: () => Promise.resolve({}),
	});

	const betterAuth = componentsGeneric().betterAuth as unknown as {
		adapter: {
			create: Parameters<typeof t.mutation>[0];
			findOne: Parameters<typeof t.query>[0];
		};
	};

	await t.mutation(betterAuth.adapter.create, {
		input: {
			model: "user",
			data: {
				name: "Ana",
				email: "ana@correo.com",
				emailVerified: false,
				createdAt: 1,
				updatedAt: 1,
			},
		},
	});

	const ana = await t.query(betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: "ana@correo.com" }],
	});
	const nadie = await t.query(betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: "nadie@correo.com" }],
	});

	expect(ana).toMatchObject({ email: "ana@correo.com", name: "Ana" });
	expect(nadie).toBeNull();
});
