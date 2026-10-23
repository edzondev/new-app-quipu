import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import authSchema from "../convex/betterAuth/schema";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { components } from "../convex/_generated/api";
import schema from "../convex/schema";
import { sendCode } from "../convex/lib/email";
import { isEmailDomainBlocked } from "../convex/lib/domainPolicy";

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

async function requestCode(t: ReturnType<typeof testHarness>, email: string) {
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	const lines: string[] = [];
	const write = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.map(String).join(" "));
	};
	try {
		const response = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "http://localhost:3000",
			},
			body: JSON.stringify({ email, type: "sign-in" }),
		});
		expect(response.ok, await response.clone().text()).toBe(true);
	} finally {
		console.log = write;
	}
	const line = lines.find((text) => text.startsWith("[dev] Code for "));
	expect(line).toBeDefined();
	return line?.slice("[dev] Code for ".length + email.length + 2);
}

async function signIn(t: ReturnType<typeof testHarness>, email: string, otp: string) {
	const response = await t.fetch("/api/auth/sign-in/email-otp", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "http://localhost:3000",
		},
		body: JSON.stringify({ email, otp }),
	});
	return { status: response.status, body: await response.json() };
}

test("with a Resend key the code goes to email and not the log", async () => {
	process.env.RESEND_API_KEY = "re_test";
	const lineas: string[] = [];
	const escribir = console.log;
	console.log = (...args: unknown[]) => {
		lineas.push(args.map(String).join(" "));
	};
	try {
		const t = testHarness();
		const id = await t.run(async (ctx) => {
			return await sendCode(ctx, { email: "ana@correo.com", otp: "123456" });
		});
		expect(id).toBeTruthy();
		const correo = await t.query(components.resend.lib.get, { emailId: id ?? "" });
		expect(correo?.subject).toBe("Your Quipu code: 123456");
		expect(correo?.html).toContain("123456");
		expect(correo?.html).not.toContain("href=");
		expect(correo?.text).toContain("123456");
		expect(correo?.text).not.toContain("<html");
		expect(correo?.to).toEqual(["ana@correo.com"]);
	} finally {
		console.log = escribir;
		delete process.env.RESEND_API_KEY;
	}
	expect(lineas.join("\n")).not.toContain("[dev] Code for");
});

test("a bad code is rejected and the fourth attempt is blocked", async () => {
	delete process.env.RESEND_API_KEY;
	const t = testHarness();
	const email = "ana@correo.com";
	const otp = await requestCode(t, email);
	const wrong = otp === "000000" ? "111111" : "000000";
	for (let attempt = 0; attempt < 3; attempt++) {
		const rejected = await signIn(t, email, wrong);
		expect(rejected.body.code).toBe("INVALID_OTP");
	}
	const blocked = await signIn(t, email, wrong);
	expect(blocked.body.code).toBe("TOO_MANY_ATTEMPTS");
});

test("after 601 seconds the code expires", async () => {
	delete process.env.RESEND_API_KEY;
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		const t = testHarness();
		const email = "ana@correo.com";
		const otp = await requestCode(t, email);
		vi.advanceTimersByTime(601_000);
		const expired = await signIn(t, email, otp ?? "");
		expect(expired.body.code).toBe("OTP_EXPIRED");
	} finally {
		vi.useRealTimers();
	}
});

test("the code is stored hashed and a new one invalidates the previous", async () => {
	delete process.env.RESEND_API_KEY;
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		const t = testHarness();
		const email = "ana@correo.com";
		const first = await requestCode(t, email);
		const stored = await t.query(components.betterAuth.adapter.findOne, {
			model: "verification",
			where: [{ field: "identifier", value: `sign-in-otp-${email}` }],
		});
		expect(stored).toBeTruthy();
		expect(JSON.stringify(stored)).not.toContain(first);
		vi.advanceTimersByTime(90_000);
		const second = await requestCode(t, email);
		expect(second).not.toBe(first);
		const oldCode = await signIn(t, email, first ?? "");
		expect(oldCode.body.code).toBe("INVALID_OTP");
		const fresh = await signIn(t, email, second ?? "");
		expect(fresh.status).toBe(200);
	} finally {
		vi.useRealTimers();
	}
});

test("password sign-up fails", async () => {
	const t = testHarness();
	const response = await t.fetch("/api/auth/sign-up/email", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "http://localhost:3000",
		},
		body: JSON.stringify({
			email: "ana@correo.com",
			password: "una-clave-larga",
			name: "Ana",
		}),
	});
	expect(response.ok).toBe(false);
});

test("the code is six digits", async () => {
	delete process.env.RESEND_API_KEY;
	const t = testHarness();
	const otp = await requestCode(t, "ana@correo.com");
	expect(otp).toMatch(/^\d{6}$/);
});

test("email verify or password recovery does not write a code", async () => {
	delete process.env.RESEND_API_KEY;
	const t = testHarness();
	const email = "ana@correo.com";
	const otp = await requestCode(t, email);
	expect((await signIn(t, email, otp ?? "")).status).toBe(200);
	for (const type of ["email-verification", "forget-password"]) {
		const lines: string[] = [];
		const write = console.log;
		console.log = (...args: unknown[]) => {
			lines.push(args.map(String).join(" "));
		};
		try {
			const response = await t.fetch("/api/auth/email-otp/send-verification-otp", {
				method: "POST",
				headers: { "content-type": "application/json", origin: "http://localhost:3000" },
				body: JSON.stringify({ email, type }),
			});
			expect(response.status).toBe(400);
		} finally {
			console.log = write;
		}
		expect(lines.some((text) => text.startsWith("[dev] Code for "))).toBe(false);
	}
});

test("an invalid type does not consume the resend slot", async () => {
	delete process.env.RESEND_API_KEY;
	const t = testHarness();
	const response = await t.fetch("/api/auth/email-otp/send-verification-otp", {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify({ email: "ana@correo.com", type: "change-email" }),
	});
	expect(response.status).toBe(400);
	const otp = await requestCode(t, "ana@correo.com");
	expect(otp).toMatch(/^\d{6}$/);
});

test("a blocked domain returns 400 on send", async () => {
	delete process.env.RESEND_API_KEY;
	const lines: string[] = [];
	const write = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.map(String).join(" "));
	};
	try {
		const t = testHarness();
		const response = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "http://localhost:3000",
			},
			body: JSON.stringify({ email: "ana@mailinator.com", type: "sign-in" }),
		});
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe("EMAIL_NOT_ALLOWED");
		expect(body.message).toBe("We cannot register accounts with that email domain.");
	} finally {
		console.log = write;
	}
	expect(lines.join("\n")).not.toContain("[dev] Code for");
});

test("a malformed email returns INVALID_EMAIL", async () => {
	delete process.env.RESEND_API_KEY;
	const t = testHarness();
	const response = await t.fetch("/api/auth/email-otp/send-verification-otp", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "http://localhost:3000",
		},
		body: JSON.stringify({ email: "not-an-email", type: "sign-in" }),
	});
	expect(response.status).toBe(400);
	expect((await response.json()).code).toBe("INVALID_EMAIL");
	const otp = await requestCode(t, "ana@correo.com");
	expect(otp).toMatch(/^\d{6}$/);
});

test("a second send before 90 s is rejected", async () => {
	delete process.env.RESEND_API_KEY;
	vi.useFakeTimers({ toFake: ["Date"] });
	try {
		const t = testHarness();
		const email = "ana@correo.com";
		await requestCode(t, email);
		const response = await t.fetch("/api/auth/email-otp/send-verification-otp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "http://localhost:3000",
			},
			body: JSON.stringify({ email, type: "sign-in" }),
		});
		expect(response.status).toBe(429);
		expect((await response.json()).code).toBe("WAIT_TO_RESEND");
	} finally {
		vi.useRealTimers();
	}
});

test("without a key outside local the code is not written", async () => {
	delete process.env.RESEND_API_KEY;
	process.env.CONVEX_CLOUD_URL = "https://quipu.convex.cloud";
	const lines: string[] = [];
	const write = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.map(String).join(" "));
	};
	try {
		const t = testHarness();
		await t.run(async (ctx) => {
			await expect(sendCode(ctx, { email: "ana@correo.com", otp: "123456" })).rejects.toThrow(
				"Missing RESEND_API_KEY",
			);
		});
	} finally {
		console.log = write;
	}
	expect(lines.join("\n")).not.toContain("123456");
});

test("a new email gets a code and signing in creates the account", async () => {
	delete process.env.RESEND_API_KEY;
	const t = testHarness();
	const email = "nueva@correo.com";
	const otp = await requestCode(t, email);
	expect(otp).toMatch(/^\d{6}$/);
	expect((await signIn(t, email, otp ?? "")).status).toBe(200);
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	expect(user?.name).toBe("");
	const profile = await t.run(async (ctx) => {
		return await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.unique();
	});
	expect(profile?.name).toBe("");
	expect(profile?.currentStep).toBe("step-1");
});

for (const route of [
	"/api/auth/email-otp/request-password-reset",
	"/api/auth/forget-password/email-otp",
	"/api/auth/email-otp/reset-password",
	"/api/auth/email-otp/request-email-change",
]) {
	test(`${route} returns 404`, async () => {
		const t = testHarness();
		const response = await t.fetch(route, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "http://localhost:3000",
			},
			body: JSON.stringify({ email: "ana@correo.com", otp: "123456", newPassword: "una-clave" }),
		});
		expect(response.status).toBe(404);
	});
}

test("gmxmail.com is allowed and a gmail typo is not", () => {
	expect(isEmailDomainBlocked("ana@gmxmail.com")).toBe(false);
	expect(isEmailDomainBlocked("ana@gmxxail.com")).toBe(true);
});
