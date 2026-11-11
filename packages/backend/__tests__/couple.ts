import polarTest from "@convex-dev/polar/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { expect, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import type { Subscription } from "@convex-dev/polar";
import authSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";

export const DAY = 24 * 60 * 60 * 1000;
export const START = "2026-10-20T17:00:00.000Z";
export const TODAY = "2026-10-20";

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");

export function harness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	polarTest.register(t);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

export type Harness = ReturnType<typeof harness>;

function post(t: Harness, path: string, body: object) {
	return t.fetch(`/api/auth${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify(body),
	});
}

async function sendCode(t: Harness, email: string) {
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

export async function signUp(t: Harness, email: string, name: string) {
	const otp = await sendCode(t, email);
	const res = await post(t, "/sign-in/email-otp", { email, otp, name });
	expect(res.status, await res.clone().text()).toBe(200);
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	// Stretch the 7-day session so tests can jump weeks ahead.
	await t.mutation(components.betterAuth.adapter.updateOne, {
		input: {
			model: "session",
			where: [{ field: "userId", value: user._id }],
			update: { expiresAt: Date.UTC(2027, 0, 1) },
		},
	});
	const session = await t.query(components.betterAuth.adapter.findOne, {
		model: "session",
		where: [{ field: "userId", value: user._id }],
	});
	return { as: t.withIdentity({ subject: user._id, sessionId: session._id }), userId: user._id };
}

export const monthly15 = {
	cadence: "monthly" as const,
	cycleStartDay: 15,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: { needs: 60, wants: 20, savings: 20 },
};

/** A person who finished Primeros pasos, on Gratis, under the fake clock. */
export async function onboardUser(t: Harness, email: string, name: string) {
	vi.useFakeTimers({ now: new Date(START) });
	const user = await signUp(t, email, name);
	await user.as.mutation(api.profiles.completeOnboarding, { ...monthly15, name });
	return user;
}

/** The same person after asking for the 14-day Plus trial. */
export async function startUser(t: Harness, email: string, name: string) {
	const user = await onboardUser(t, email, name);
	await user.as.mutation(api.profiles.startTrial, {});
	return user;
}

/** Camila ("Camila Rojas") created the household; Renzo ("Renzo Paz") is signed in, not yet inside. */
export async function couple() {
	const t = harness();
	const ana = await startUser(t, "camila@correo.com", "Camila Rojas");
	const luis = await startUser(t, "renzo@correo.com", "Renzo Paz");
	const { code } = await ana.as.mutation(api.household.createHousehold, {});
	return { t, ana, luis, code };
}

/** Both inside the household. */
export async function joinedCouple() {
	const pair = await couple();
	expect(await pair.luis.as.mutation(api.household.joinHousehold, { code: pair.code })).toEqual({
		ok: true,
	});
	return pair;
}

export async function householdSpaceId(t: Harness) {
	return await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(10)).find((row) => row.kind === "household");
		if (!space) throw new Error("missing household");
		return space._id;
	});
}

/** Gives one person Plus for another year (or takes it away with a past date). */
export async function setTrialEnd(t: Harness, userId: string, trialEndsAt: number) {
	await t.run(async (ctx) => {
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
		if (!profile) throw new Error("missing profile");
		await ctx.db.patch("profiles", profile._id, { trialEndsAt });
	});
}

const subscriptionBase: Subscription = {
	id: "sub_test",
	customerId: "cus_test",
	createdAt: START,
	modifiedAt: START,
	productId: "prod_plus_monthly",
	checkoutId: null,
	amount: 1490,
	currency: "pen",
	recurringInterval: "month",
	status: "active",
	currentPeriodStart: START,
	currentPeriodEnd: new Date(Date.parse(START) + 30 * DAY).toISOString(),
	cancelAtPeriodEnd: false,
	startedAt: START,
	endedAt: null,
	metadata: {},
};

/** Links the person to a Polar customer and stores a subscription for it, as the webhook would. */
export async function subscribe(t: Harness, userId: string, over: Partial<Subscription> = {}) {
	await t.mutation(components.polar.lib.insertCustomer, { id: `cus_${userId}`, userId });
	await t.mutation(components.polar.lib.updateSubscription, {
		subscription: {
			...subscriptionBase,
			id: `sub_${userId}`,
			customerId: `cus_${userId}`,
			...over,
		},
	});
}

/** A product as the component stores it, for billing.offer. */
export async function addProduct(
	t: Harness,
	id: string,
	interval: "month" | "year" | null,
	prices: { currency: string; amount: number; archived?: boolean }[],
) {
	await t.mutation(components.polar.lib.createProduct, {
		product: {
			id,
			organizationId: "org_test",
			name: "Quipu Plus",
			description: null,
			isRecurring: interval !== null,
			isArchived: false,
			createdAt: START,
			modifiedAt: null,
			recurringInterval: interval,
			medias: [],
			prices: prices.map((price) => ({
				id: `${id}_${price.currency}`,
				productId: id,
				amountType: "fixed",
				isArchived: price.archived ?? false,
				createdAt: START,
				modifiedAt: null,
				recurringInterval: interval,
				type: "recurring",
				source: "catalog",
				priceAmount: price.amount,
				priceCurrency: price.currency,
			})),
		},
	});
}
