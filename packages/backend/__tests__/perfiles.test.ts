import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");
const cloudUrl = process.env.CONVEX_CLOUD_URL;

afterEach(() => {
	if (cloudUrl === undefined) delete process.env.CONVEX_CLOUD_URL;
	else process.env.CONVEX_CLOUD_URL = cloudUrl;
});

function prueba() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

test("crear la cuenta deja el perfil en el paso 1 y se puede guardar el borrador", async () => {
	delete process.env.RESEND_API_KEY;
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	const t = prueba();
	const email = "ana@correo.com";
	expect(await t.query(api.perfiles.miPerfil, {})).toBeNull();

	const lineas: string[] = [];
	const escribir = console.log;
	console.log = (...args: unknown[]) => {
		lineas.push(args.map(String).join(" "));
	};
	try {
		const envio = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: { "content-type": "application/json", origin: "http://localhost:3000" },
			body: JSON.stringify({ email, type: "sign-in" }),
		});
		expect(envio.ok, await envio.clone().text()).toBe(true);
	} finally {
		console.log = escribir;
	}
	const linea = lineas.find((texto) => texto.startsWith("[dev] Código para "));
	const codigo = linea?.slice("[dev] Código para ".length + email.length + 2);
	const entrada = await t.fetch("/api/auth/sign-in/email-otp", {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify({ email, otp: codigo, name: "Ana" }),
	});
	expect(entrada.status, await entrada.clone().text()).toBe(200);

	const usuario = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	const sesion = await t.query(components.betterAuth.adapter.findOne, {
		model: "session",
		where: [{ field: "userId", value: usuario._id }],
	});
	const yo = t.withIdentity({ subject: usuario._id, sessionId: sesion._id });
	const inicial = await yo.query(api.perfiles.miPerfil, {});
	expect(inicial?.nombre).toBe("Ana");
	expect(inicial?.pasoActual).toBe("paso-1");

	await yo.mutation(api.perfiles.guardarPrimerosPasos, {
		paso: "paso-2",
		borradorSueldoCentimos: 4230,
		borradorDiaDeCobro: 15,
	});
	const guardado = await yo.query(api.perfiles.miPerfil, {});
	expect(guardado?.pasoActual).toBe("paso-2");
	expect(guardado?.borradorSueldoCentimos).toBe(4230);
	expect(guardado?.borradorDiaDeCobro).toBe(15);
});

async function abrirSesion(t: ReturnType<typeof prueba>, email: string, nombre: string) {
	delete process.env.RESEND_API_KEY;
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	const lineas: string[] = [];
	const escribir = console.log;
	console.log = (...args: unknown[]) => {
		lineas.push(args.map(String).join(" "));
	};
	try {
		const envio = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: { "content-type": "application/json", origin: "http://localhost:3000" },
			body: JSON.stringify({ email, type: "sign-in" }),
		});
		expect(envio.ok, await envio.clone().text()).toBe(true);
	} finally {
		console.log = escribir;
	}
	const linea = lineas.find((texto) => texto.startsWith("[dev] Código para "));
	const codigo = linea?.slice("[dev] Código para ".length + email.length + 2);
	const entrada = await t.fetch("/api/auth/sign-in/email-otp", {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify({ email, otp: codigo, name: nombre }),
	});
	expect(entrada.status, await entrada.clone().text()).toBe(200);
	const usuario = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	const sesion = await t.query(components.betterAuth.adapter.findOne, {
		model: "session",
		where: [{ field: "userId", value: usuario._id }],
	});
	return t.withIdentity({ subject: usuario._id, sessionId: sesion._id });
}

test("el borrador rechaza sueldo o día que no son enteros válidos", async () => {
	const t = prueba();
	const yo = await abrirSesion(t, "ana@correo.com", "Ana");
	await expect(
		yo.mutation(api.perfiles.guardarPrimerosPasos, {
			paso: "paso-2",
			borradorSueldoCentimos: -1,
		}),
	).rejects.toThrow("Esos datos no sirven.");
	await expect(
		yo.mutation(api.perfiles.guardarPrimerosPasos, {
			paso: "paso-2",
			borradorSueldoCentimos: Number.NaN,
		}),
	).rejects.toThrow();
	await expect(
		yo.mutation(api.perfiles.guardarPrimerosPasos, {
			paso: "paso-2",
			borradorDiaDeCobro: 99,
		}),
	).rejects.toThrow("Esos datos no sirven.");
	await expect(
		yo.mutation(api.perfiles.guardarPrimerosPasos, {
			paso: "paso-2",
			borradorDiaDeCobro: -1,
		}),
	).rejects.toThrow("Esos datos no sirven.");
	await expect(
		yo.mutation(api.perfiles.guardarPrimerosPasos, {
			paso: "paso-2",
			borradorDiaDeCobro: Number.NaN,
		}),
	).rejects.toThrow();
	await expect(
		yo.mutation(api.perfiles.guardarPrimerosPasos, {
			paso: "paso-2",
			borradorSueldoCentimos: 12.75,
		}),
	).rejects.toThrow("Esos datos no sirven.");
	await expect(
		yo.mutation(api.perfiles.guardarPrimerosPasos, {
			paso: "paso-2",
			borradorSueldoCentimos: 1.5,
		}),
	).rejects.toThrow("Esos datos no sirven.");
	expect((await yo.query(api.perfiles.miPerfil, {}))?.pasoActual).toBe("paso-1");
});

test("guardar el paso de una persona no cambia el perfil de otra", async () => {
	const t = prueba();
	const ana = await abrirSesion(t, "ana@correo.com", "Ana");
	const luis = await abrirSesion(t, "luis@correo.com", "Luis");
	await luis.mutation(api.perfiles.guardarPrimerosPasos, {
		paso: "paso-2",
		borradorSueldoCentimos: 100,
		borradorDiaDeCobro: 2,
	});
	const deAna = await ana.query(api.perfiles.miPerfil, {});
	const deLuis = await luis.query(api.perfiles.miPerfil, {});
	expect(deLuis?.borradorSueldoCentimos).toBe(100);
	expect(deLuis?.pasoActual).toBe("paso-2");
	expect(deAna?.nombre).toBe("Ana");
	expect(deAna?.pasoActual).toBe("paso-1");
	expect(deAna?.borradorSueldoCentimos).toBeUndefined();
});
