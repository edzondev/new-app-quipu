import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import {
	addProduct,
	couple,
	DAY,
	harness,
	joinedCouple,
	setTrialEnd,
	START,
	startUser,
	subscribe,
} from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const NOW = Date.parse(START);
const past = new Date(NOW - DAY).toISOString();
const future = new Date(NOW + 10 * DAY).toISOString();
const READ_ONLY = "Solo lectura. Activa Plus para seguir anotando.";

async function singleUser() {
	const t = harness();
	const user = await startUser(t, "camila@correo.com", "Camila Rojas");
	return { t, user };
}

async function hasPlus(user: Awaited<ReturnType<typeof startUser>>) {
	return (await user.as.query(api.profiles.myProfile, {}))?.hasPlus;
}

test("an open trial gives Plus and a lapsed one takes it away", async () => {
	const { t, user } = await singleUser();
	expect(await hasPlus(user)).toBe(true);
	await setTrialEnd(t, user.userId, NOW - 1);
	expect(await hasPlus(user)).toBe(false);
});

const states: [string, Parameters<typeof subscribe>[2], boolean][] = [
	["active", { status: "active" }, true],
	["trialing", { status: "trialing" }, true],
	["past_due, the grace period", { status: "past_due" }, true],
	["active but set to cancel at period end", { cancelAtPeriodEnd: true }, true],
	[
		"canceled with the paid period still running",
		{ status: "canceled", currentPeriodEnd: future },
		true,
	],
	["canceled and the paid period closed", { status: "canceled", currentPeriodEnd: past }, false],
	[
		"revoked: ended, though its paid period was still open",
		{ status: "canceled", endedAt: past, currentPeriodEnd: future },
		false,
	],
	["unpaid", { status: "unpaid" }, false],
	["incomplete", { status: "incomplete" }, false],
	["incomplete_expired", { status: "incomplete_expired" }, false],
	["paused", { status: "paused" }, false],
];

test.each(states)(
	"with the trial lapsed, a subscription %s -> Plus %s",
	async (_name, over, plus) => {
		const { t, user } = await singleUser();
		await setTrialEnd(t, user.userId, NOW - 1);
		await subscribe(t, user.userId, over);
		expect(await hasPlus(user)).toBe(plus);
	},
);

test("a subscription stops giving Plus once its end date passes", async () => {
	const { t, user } = await singleUser();
	await setTrialEnd(t, user.userId, NOW - 1);
	await subscribe(t, user.userId, { endedAt: future });
	expect(await hasPlus(user)).toBe(true);
	vi.setSystemTime(NOW + 11 * DAY);
	expect(await hasPlus(user)).toBe(false);
});

test("someone else's subscription gives no Plus", async () => {
	const { t, user } = await singleUser();
	const other = await startUser(t, "renzo@correo.com", "Renzo Paz");
	await setTrialEnd(t, user.userId, NOW - 1);
	await subscribe(t, other.userId);
	expect(await hasPlus(user)).toBe(false);
});

test("billing.subscription shows the paid subscription, and nothing for a trial", async () => {
	const { t, user } = await singleUser();
	expect(await user.as.query(api.billing.subscription, {})).toBeNull();
	await subscribe(t, user.userId, { cancelAtPeriodEnd: true });
	expect(await user.as.query(api.billing.subscription, {})).toEqual({
		status: "active",
		interval: "month",
		cancelAtPeriodEnd: true,
		currentPeriodEnd: new Date(NOW + 30 * DAY).toISOString(),
		amountCents: 1490,
		currency: "pen",
	});
});

test("billing.offer is empty until products are synced", async () => {
	const { user } = await singleUser();
	expect(await user.as.query(api.billing.offer, {})).toEqual([]);
});

test("billing.offer lists only current prices, and no product without any", async () => {
	const { t, user } = await singleUser();
	await addProduct(t, "prod_month", "month", [
		{ currency: "pen", amount: 1490 },
		{ currency: "usd", amount: 499, archived: true },
	]);
	await addProduct(t, "prod_year", "year", [{ currency: "pen", amount: 11990 }]);
	await addProduct(t, "prod_empty", "month", []);
	await addProduct(t, "prod_once", null, [{ currency: "pen", amount: 500 }]);
	const offers = await user.as.query(api.billing.offer, {});
	expect(offers.toSorted((a, b) => a.productId.localeCompare(b.productId))).toEqual([
		{
			productId: "prod_month",
			interval: "month",
			prices: [{ currency: "pen", amountCents: 1490 }],
		},
		{ productId: "prod_year", interval: "year", prices: [{ currency: "pen", amountCents: 11990 }] },
	]);
});

test("billing.startCheckout says the price is pending when there is none in that currency", async () => {
	const { t, user } = await singleUser();
	await addProduct(t, "prod_month", "month", [
		{ currency: "pen", amount: 1490 },
		{ currency: "usd", amount: 499, archived: true },
	]);
	const pending = "Precio por confirmar";
	await expect(
		user.as.action(api.billing.startCheckout, {
			interval: "month",
			currency: "usd",
			returnTo: "/settings",
		}),
	).rejects.toThrow(pending);
	await expect(
		user.as.action(api.billing.startCheckout, {
			interval: "year",
			currency: "pen",
			returnTo: "/settings",
		}),
	).rejects.toThrow(pending);
});

test("billing.openPortal needs a Polar customer", async () => {
	const { user } = await singleUser();
	await expect(user.as.action(api.billing.openPortal, { returnTo: "/settings" })).rejects.toThrow(
		"Aún no tienes una suscripción",
	);
});

test("with a monthly set to cancel and an annual running, the annual is the subscription shown", async () => {
	const { t, user } = await singleUser();
	await setTrialEnd(t, user.userId, NOW - 1);
	await subscribe(t, user.userId, {
		id: "sub_monthly",
		cancelAtPeriodEnd: true,
		currentPeriodEnd: future,
	});
	await subscribe(t, user.userId, {
		id: "sub_annual",
		recurringInterval: "year",
		amount: 11990,
		currentPeriodEnd: new Date(NOW + 300 * DAY).toISOString(),
	});
	expect(await hasPlus(user)).toBe(true);
	expect((await user.as.query(api.billing.subscription, {}))?.interval).toBe("year");
});

test("a subscription with no period end outranks one that ends, when both give Plus", async () => {
	const { t, user } = await singleUser();
	await setTrialEnd(t, user.userId, NOW - 1);
	await subscribe(t, user.userId, { id: "sub_dated", currentPeriodEnd: future });
	await subscribe(t, user.userId, {
		id: "sub_open",
		recurringInterval: "year",
		currentPeriodEnd: null,
	});
	await subscribe(t, user.userId, {
		id: "sub_later",
		currentPeriodEnd: new Date(NOW + 300 * DAY).toISOString(),
	});
	expect((await user.as.query(api.billing.subscription, {}))?.currentPeriodEnd).toBeNull();
});

test("a canceled subscription with no period end gives no Plus", async () => {
	const { t, user } = await singleUser();
	await setTrialEnd(t, user.userId, NOW - 1);
	await subscribe(t, user.userId, { status: "canceled", currentPeriodEnd: null });
	expect(await hasPlus(user)).toBe(false);
	expect(await user.as.query(api.billing.subscription, {})).toBeNull();
});

test("billing.startCheckout refuses someone who already pays", async () => {
	const { t, user } = await singleUser();
	await subscribe(t, user.userId);
	await expect(
		user.as.action(api.billing.startCheckout, {
			interval: "month",
			currency: "pen",
			returnTo: "/settings",
		}),
	).rejects.toThrow("Ya tienes Plus");
});

async function household() {
	const pair = await joinedCouple();
	const { ana, luis, t } = pair;
	await setTrialEnd(t, ana.userId, NOW - 1);
	await setTrialEnd(t, luis.userId, NOW - 1);
	return pair;
}

const view = (person: Awaited<ReturnType<typeof startUser>>) =>
	person.as.query(api.household.get, {});

test("in a household where only one pays, both have Plus and the payer is named", async () => {
	const { t, ana, luis } = await household();
	await subscribe(t, luis.userId);
	for (const person of [ana, luis]) {
		expect((await view(person))?.plus.active).toBe(true);
	}
	expect((await view(ana))?.plus).toEqual({ active: true, payerName: "Renzo", payerIsMe: false });
	expect((await view(luis))?.plus).toMatchObject({ payerName: "Renzo", payerIsMe: true });
});

test("a subscription outranks a trial, and the owner pays when both qualify", async () => {
	const { t, ana, luis, code } = await couple();
	await luis.as.mutation(api.household.joinHousehold, { code });
	await subscribe(t, luis.userId);
	expect((await view(ana))?.plus.payerName).toBe("Renzo");
	await subscribe(t, ana.userId);
	expect((await view(ana))?.plus.payerIsMe).toBe(true);
});

test("when nobody has Plus the household is read-only and names whose Plus ended", async () => {
	const { ana } = await household();
	expect((await view(ana))?.plus).toEqual({ active: false, payerName: "Camila", payerIsMe: true });
	await expect(
		ana.as.mutation(api.transactions.addIncome, { space: "household", amountCents: 100 }),
	).rejects.toThrow(READ_ONLY);
});
