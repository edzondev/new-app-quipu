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

function testHarness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

test("creating an account leaves the profile on step 1 and can save the draft", async () => {
	delete process.env.RESEND_API_KEY;
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	const t = testHarness();
	const email = "ana@correo.com";
	expect(await t.query(api.profiles.myProfile, {})).toBeNull();

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
	const linea = lineas.find((texto) => texto.startsWith("[dev] Code for "));
	const codigo = linea?.slice("[dev] Code for ".length + email.length + 2);
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
	const inicial = await yo.query(api.profiles.myProfile, {});
	expect(inicial?.name).toBe("Ana");
	expect(inicial?.currentStep).toBe("step-1");

	await yo.mutation(api.profiles.saveOnboardingSteps, {
		step: "step-2",
		draftSalaryCents: 4230,
		draftPayday: 15,
	});
	const guardado = await yo.query(api.profiles.myProfile, {});
	expect(guardado?.currentStep).toBe("step-2");
	expect(guardado?.draftSalaryCents).toBe(4230);
	expect(guardado?.draftPayday).toBe(15);
});

async function openSession(t: ReturnType<typeof testHarness>, email: string, nombre: string) {
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
	const linea = lineas.find((texto) => texto.startsWith("[dev] Code for "));
	const codigo = linea?.slice("[dev] Code for ".length + email.length + 2);
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

test("the draft rejects salary or payday values that are not valid integers", async () => {
	const t = testHarness();
	const yo = await openSession(t, "ana@correo.com", "Ana");
	await expect(
		yo.mutation(api.profiles.saveOnboardingSteps, {
			step: "step-2",
			draftSalaryCents: -1,
		}),
	).rejects.toThrow("Those values are invalid.");
	await expect(
		yo.mutation(api.profiles.saveOnboardingSteps, {
			step: "step-2",
			draftSalaryCents: Number.NaN,
		}),
	).rejects.toThrow();
	await expect(
		yo.mutation(api.profiles.saveOnboardingSteps, {
			step: "step-2",
			draftPayday: 99,
		}),
	).rejects.toThrow("Those values are invalid.");
	await expect(
		yo.mutation(api.profiles.saveOnboardingSteps, {
			step: "step-2",
			draftPayday: -1,
		}),
	).rejects.toThrow("Those values are invalid.");
	await expect(
		yo.mutation(api.profiles.saveOnboardingSteps, {
			step: "step-2",
			draftPayday: Number.NaN,
		}),
	).rejects.toThrow();
	await expect(
		yo.mutation(api.profiles.saveOnboardingSteps, {
			step: "step-2",
			draftPayday: 1.5,
		}),
	).rejects.toThrow("Those values are invalid.");
	await expect(
		yo.mutation(api.profiles.saveOnboardingSteps, {
			step: "step-2",
			draftSalaryCents: 12.75,
		}),
	).rejects.toThrow("Those values are invalid.");
	await expect(
		yo.mutation(api.profiles.saveOnboardingSteps, {
			step: "step-2",
			draftSalaryCents: 1.5,
		}),
	).rejects.toThrow("Those values are invalid.");
	expect((await yo.query(api.profiles.myProfile, {}))?.currentStep).toBe("step-1");
});

test("saving one person's step does not change another profile", async () => {
	const t = testHarness();
	const ana = await openSession(t, "ana@correo.com", "Ana");
	const luis = await openSession(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.saveOnboardingSteps, {
		step: "step-2",
		draftSalaryCents: 100,
		draftPayday: 2,
	});
	const deAna = await ana.query(api.profiles.myProfile, {});
	const deLuis = await luis.query(api.profiles.myProfile, {});
	expect(deLuis?.draftSalaryCents).toBe(100);
	expect(deLuis?.currentStep).toBe("step-2");
	expect(deAna?.name).toBe("Ana");
	expect(deAna?.currentStep).toBe("step-1");
	expect(deAna?.draftSalaryCents).toBeUndefined();
});
