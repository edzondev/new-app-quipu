import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterAll, afterEach, expect, test } from "vitest";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";

const sitio = "http://quipu.test";
process.env.SITE_URL = sitio;

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");
const cloudUrl = process.env.CONVEX_CLOUD_URL;

afterEach(() => {
	if (cloudUrl === undefined) delete process.env.CONVEX_CLOUD_URL;
	else process.env.CONVEX_CLOUD_URL = cloudUrl;
});

afterAll(() => {
	delete process.env.SITE_URL;
});

function testHarness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

test("creating a passkey requires a session", async () => {
	const t = testHarness();
	const respuesta = await t.fetch("/api/auth/passkey/generate-register-options", {
		method: "GET",
		headers: { origin: sitio },
	});
	expect(respuesta.status).toBe(401);
	expect((await respuesta.json()).code).toBe("UNAUTHORIZED");
});

test("with a session the passkey announces the site domain and Quipu name", async () => {
	delete process.env.RESEND_API_KEY;
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	process.env.SITE_URL = sitio;
	const t = testHarness();
	const email = "ana@correo.com";
	const lineas: string[] = [];
	const escribir = console.log;
	console.log = (...args: unknown[]) => {
		lineas.push(args.map(String).join(" "));
	};
	try {
		const envio = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: { "content-type": "application/json", origin: sitio },
			body: JSON.stringify({ email, type: "sign-in" }),
		});
		expect(envio.ok, await envio.clone().text()).toBe(true);
	} finally {
		console.log = escribir;
	}
	const linea = lineas.find((texto) => texto.startsWith("[dev] Code for "));
	const codigo = linea?.slice("[dev] Code for ".length + email.length + 2);
	const entrada = await t.fetch("/api/auth/sign-in/email-otp", {
		method: "POST",
		headers: { "content-type": "application/json", origin: sitio },
		body: JSON.stringify({ email, otp: codigo, name: "Ana" }),
	});
	expect(entrada.status, await entrada.clone().text()).toBe(200);
	const cookie = entrada.headers
		.getSetCookie()
		.map((parte) => parte.split(";")[0])
		.join("; ");
	const opciones = await t.fetch("/api/auth/passkey/generate-register-options", {
		method: "GET",
		headers: { origin: sitio, cookie },
	});
	expect(opciones.status, await opciones.clone().text()).toBe(200);
	const cuerpo = await opciones.json();
	expect(cuerpo.rp.id).toBe("quipu.test");
	expect(cuerpo.rp.name).toBe("Quipu");
});
