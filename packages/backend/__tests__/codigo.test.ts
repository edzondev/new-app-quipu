import resendTest from "@convex-dev/resend/test";
import schema from "../convex/betterAuth/schema";
import { convexTest } from "convex-test";
import { defineSchema } from "convex/server";
import { expect, test, vi } from "vitest";
import { components } from "../convex/_generated/api";
import { enviarCodigo } from "../convex/lib/correo";

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");

function prueba() {
	const t = convexTest(defineSchema({}), modules);
	t.registerComponent("betterAuth", schema, componentModules);
	resendTest.register(t);
	return t;
}

async function pedirCodigo(t: ReturnType<typeof prueba>, email: string) {
	const lineas: string[] = [];
	const escribir = console.log;
	console.log = (...args: unknown[]) => {
		lineas.push(args.map(String).join(" "));
	};
	try {
		const respuesta = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "http://localhost:3000",
			},
			body: JSON.stringify({ email, type: "sign-in" }),
		});
		expect(respuesta.ok, await respuesta.clone().text()).toBe(true);
	} finally {
		console.log = escribir;
	}
	const linea = lineas.find((texto) => texto.startsWith("[dev] Código para "));
	expect(linea).toBeDefined();
	return linea?.slice("[dev] Código para ".length + email.length + 2);
}

async function entrar(t: ReturnType<typeof prueba>, email: string, otp: string) {
	const respuesta = await t.fetch("/api/auth/sign-in/email-otp", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "http://localhost:3000",
		},
		body: JSON.stringify({ email, otp }),
	});
	return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test("un dominio desechable no recibe código", async () => {
	delete process.env.RESEND_API_KEY;
	const lineas: string[] = [];
	const escribir = console.log;
	console.log = (...args: unknown[]) => {
		lineas.push(args.map(String).join(" "));
	};
	try {
		const t = prueba();
		await t.run(async (ctx) => {
			await expect(
				enviarCodigo(ctx, { email: "ana@mailinator.com", otp: "123456" }),
			).rejects.toThrow("No podemos registrar cuentas con ese dominio de correo.");
		});
	} finally {
		console.log = escribir;
	}
	expect(lineas.join("\n")).not.toContain("123456");
});

test("con clave de Resend el código va al correo y no al log", async () => {
	process.env.RESEND_API_KEY = "re_test";
	const lineas: string[] = [];
	const escribir = console.log;
	console.log = (...args: unknown[]) => {
		lineas.push(args.map(String).join(" "));
	};
	try {
		const t = prueba();
		const id = await t.run(async (ctx) => {
			return await enviarCodigo(ctx, { email: "ana@correo.com", otp: "123456" });
		});
		expect(id).toBeTruthy();
		const correo = await t.query(components.resend.lib.get, { emailId: id ?? "" });
		expect(correo?.subject).toBe("Tu código de Quipu: 123456");
		expect(correo?.html).toContain("123456");
		expect(correo?.html).not.toContain("href=");
		expect(correo?.to).toEqual(["ana@correo.com"]);
	} finally {
		console.log = escribir;
		delete process.env.RESEND_API_KEY;
	}
	expect(lineas.join("\n")).not.toContain("[dev] Código para");
});

test("un código malo se rechaza y el cuarto intento se bloquea", async () => {
	delete process.env.RESEND_API_KEY;
	const t = prueba();
	const email = "ana@correo.com";
	const codigo = await pedirCodigo(t, email);
	const malo = codigo === "000000" ? "111111" : "000000";
	for (let intento = 0; intento < 3; intento++) {
		const rechazo = await entrar(t, email, malo);
		expect(rechazo.cuerpo.code).toBe("INVALID_OTP");
	}
	const bloqueo = await entrar(t, email, malo);
	expect(bloqueo.cuerpo.code).toBe("TOO_MANY_ATTEMPTS");
});

test("a los 601 segundos el código vence", async () => {
	delete process.env.RESEND_API_KEY;
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		const t = prueba();
		const email = "ana@correo.com";
		const codigo = await pedirCodigo(t, email);
		vi.advanceTimersByTime(601_000);
		const vencido = await entrar(t, email, codigo ?? "");
		expect(vencido.cuerpo.code).toBe("OTP_EXPIRED");
	} finally {
		vi.useRealTimers();
	}
});

test("el código se guarda hasheado y uno nuevo anula al anterior", async () => {
	delete process.env.RESEND_API_KEY;
	const t = prueba();
	const email = "ana@correo.com";
	const primero = await pedirCodigo(t, email);
	const guardado = await t.query(components.betterAuth.adapter.findOne, {
		model: "verification",
		where: [{ field: "identifier", value: `sign-in-otp-${email}` }],
	});
	expect(guardado).toBeTruthy();
	expect(JSON.stringify(guardado)).not.toContain(primero);
	const segundo = await pedirCodigo(t, email);
	expect(segundo).not.toBe(primero);
	const viejo = await entrar(t, email, primero ?? "");
	expect(viejo.cuerpo.code).toBe("INVALID_OTP");
	const nuevo = await entrar(t, email, segundo ?? "");
	expect(nuevo.status).toBe(200);
});
