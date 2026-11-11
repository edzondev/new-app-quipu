import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import {
	couple,
	DAY,
	harness,
	joinedCouple,
	onboardUser,
	setTrialEnd,
	START,
	startUser,
	subscribe,
} from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const NOW = Date.parse(START);
const iso = (ms: number) => new Date(ms).toISOString();
const ENDS = NOW + 30 * DAY;

type Person = Awaited<ReturnType<typeof startUser>>;
const status = (person: Person) => person.as.query(api.billing.status, {});

async function lapsedUser() {
	const t = harness();
	const user = await startUser(t, "camila@correo.com", "Camila Rojas");
	await setTrialEnd(t, user.userId, NOW - 1);
	return { t, user };
}

test("someone who never had a trial is on Gratis", async () => {
	const user = await onboardUser(harness(), "camila@correo.com", "Camila Rojas");
	expect(await status(user)).toEqual({ kind: "free" });
});

test("an open trial shows when it ends, and a lapsed one says it ended", async () => {
	const { t, user } = await lapsedUser();
	expect(await status(user)).toEqual({ kind: "trialEnded" });
	await setTrialEnd(t, user.userId, NOW + 9 * DAY);
	expect(await status(user)).toEqual({ kind: "trial", endsAt: NOW + 9 * DAY });
});

test.each([
	["monthly", {}, {}],
	[
		"annual",
		{ recurringInterval: "year", amount: 11990 },
		{ interval: "year", amountCents: 11990 },
	],
	["trialing", { status: "trialing" }, {}],
	["with no period end", { currentPeriodEnd: null }, { renewsAt: null }],
	["billed in dollars", { currency: "usd", amount: 499 }, { amountCents: null }],
] as const)("a %s subscription is paid, with no Polar ids", async (_name, over, shown) => {
	const { t, user } = await lapsedUser();
	await subscribe(t, user.userId, over);
	expect(await status(user)).toEqual({
		kind: "paid",
		interval: "month",
		amountCents: 1490,
		renewsAt: ENDS,
		...shown,
	});
});

test("a failed charge is pastDue", async () => {
	const { t, user } = await lapsedUser();
	await subscribe(t, user.userId, { status: "past_due" });
	expect(await status(user)).toEqual({ kind: "pastDue", interval: "month" });
});

test.each([
	["set to cancel at period end", { cancelAtPeriodEnd: true }],
	["canceled with its period still running", { status: "canceled" }],
] as const)("a subscription %s is ending", async (_name, over) => {
	const { t, user } = await lapsedUser();
	await subscribe(t, user.userId, over);
	expect(await status(user)).toEqual({ kind: "ending", interval: "month", endsAt: ENDS });
});

test("a canceled subscription whose period closed is lapsed", async () => {
	const { t, user } = await lapsedUser();
	await subscribe(t, user.userId, { status: "canceled", currentPeriodEnd: iso(NOW - DAY) });
	expect(await status(user)).toEqual({ kind: "lapsed", payerIsMe: true });
});

test("a subscription of one's own outranks the trial", async () => {
	const t = harness();
	const user = await startUser(t, "camila@correo.com", "Camila Rojas");
	await subscribe(t, user.userId);
	expect(await status(user)).toMatchObject({ kind: "paid" });
});

test("in a household the payer is paid and the partner sees the household's Plus, whatever their trial", async () => {
	const { t, ana, luis } = await joinedCouple();
	await subscribe(t, luis.userId);
	expect(await status(luis)).toMatchObject({ kind: "paid" });
	expect(await status(ana)).toEqual({ kind: "household", payerName: "Renzo" });
});

test("when nobody has Plus, whoever paid first is told to renew and the other to pay", async () => {
	const { t, ana, luis } = await joinedCouple();
	for (const person of [ana, luis]) {
		await setTrialEnd(t, person.userId, NOW - 1);
		await subscribe(t, person.userId, { status: "canceled", currentPeriodEnd: iso(NOW - DAY) });
	}
	expect(await status(ana)).toEqual({ kind: "lapsed", payerIsMe: true });
	expect(await status(luis)).toEqual({ kind: "lapsed", payerIsMe: false });
});

test("an owner waiting for a partner keeps their own trial", async () => {
	const { ana } = await couple();
	expect(await status(ana)).toMatchObject({ kind: "trial" });
});

test("signed out there is no status", async () => {
	expect(await harness().query(api.billing.status, {})).toBeNull();
});
