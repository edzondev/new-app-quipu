import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import {
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
	["canceled and ended", { status: "canceled", endedAt: past, currentPeriodEnd: past }, false],
	["unpaid", { status: "unpaid" }, false],
	["incomplete", { status: "incomplete" }, false],
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

test("billing.startCheckout refuses someone who already pays", async () => {
	const { t, user } = await singleUser();
	await subscribe(t, user.userId);
	await expect(
		user.as.action(api.billing.startCheckout, { interval: "month", currency: "pen" }),
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
