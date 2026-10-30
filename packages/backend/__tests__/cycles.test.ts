import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import { requireSpaceById } from "../convex/model/spaces";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";

afterEach(() => {
	vi.useRealTimers();
});

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");

function harness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

function post(t: ReturnType<typeof harness>, path: string, body: object) {
	return t.fetch(`/api/auth${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify(body),
	});
}

async function sendCode(t: ReturnType<typeof harness>, email: string) {
	process.env.OTP_DELIVERY = "log";
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	const lines: string[] = [];
	const log = console.log;
	console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
	try {
		const sent = await post(t, "/email-otp/send-verification-otp", { email, type: "sign-in" });
		expect(sent.ok, await sent.clone().text()).toBe(true);
	} finally {
		console.log = log;
	}
	return lines.find((l) => l.startsWith(`OTP ${email}: `))?.slice(`OTP ${email}: `.length);
}

async function signIn(t: ReturnType<typeof harness>, email: string, name: string) {
	const otp = await sendCode(t, email);
	const res = await post(t, "/sign-in/email-otp", { email, otp, name });
	expect(res.status, await res.clone().text()).toBe(200);
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	const session = await t.query(components.betterAuth.adapter.findOne, {
		model: "session",
		where: [{ field: "userId", value: user._id }],
	});
	return t.withIdentity({ subject: user._id, sessionId: session._id });
}

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	incomeCents: 150_000,
	todayCents: 50_000,
	split: { needs: 50, wants: 30, savings: 20 },
};

test("requireSpaceById allows your space and rejects someone else's", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.mutation(api.profiles.completeOnboarding, onboard);
	const spaceId = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return space._id as Id<"spaces">;
	});

	await ana.run(async (ctx) => {
		const { space } = await requireSpaceById(ctx, spaceId);
		expect(space._id).toBe(spaceId);
	});

	const luis = await signIn(t, "luis@correo.com", "Luis");
	await expect(luis.run(async (ctx) => requireSpaceById(ctx, spaceId))).rejects.toThrow(
		"No encontramos este dato.",
	);
});

test("ensureOpen creates the next cycle when the previous one already ended", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	// Onboard on 20 Oct → first cycle 20–31 Oct with S/ 500 at 50/30/20.
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboard);

	const before = await t.run(async (ctx) => {
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		return {
			id: cycle._id,
			envelopes: cycle.envelopes,
			endDate: cycle.endDate,
		};
	});
	expect(before.endDate).toBe("2026-10-31");

	// App opens on 1 Nov: previous cycle ended; create the next without waiting for cron.
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	const open = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(open).toMatchObject({ startDate: "2026-11-01", endDate: "2026-11-30" });

	const after = await t.run(async (ctx) => {
		const cycles = await ctx.db.query("cycles").take(5);
		const closed = cycles.find((c) => c._id === before.id)!;
		const next = cycles.find((c) => c._id === open.cycleId)!;
		const savings = await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", closed.spaceId).eq("kind", "saving"))
			.take(5);
		return { closed, next, savings };
	});

	expect(after.closed.closedAt).toEqual(expect.any(Number));
	expect(after.next).toMatchObject({
		startDate: "2026-11-01",
		endDate: "2026-11-30",
		carryIn: { needsCents: 25_000, wantsCents: 15_000 },
		envelopes: { needsCents: 25_000, wantsCents: 15_000, savingsCents: 0 },
	});
	expect(after.savings).toHaveLength(1);
	expect(after.savings[0]).toMatchObject({
		kind: "saving",
		amountCents: 10_000,
		date: "2026-10-31",
	});

	// Idempotent: opening again does not create another cycle.
	const again = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(again.cycleId).toBe(open.cycleId);
	const count = await t.run(async (ctx) => (await ctx.db.query("cycles").take(5)).length);
	expect(count).toBe(2);
});
