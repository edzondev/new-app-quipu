import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { NEED_PLUS } from "../shared/billing";
import { DAY, harness, onboardUser, setTrialEnd, START, subscribe } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const NOW = Date.parse(START);
const TRIAL_END = NOW + 14 * DAY;

async function newUser() {
	const t = harness();
	const user = await onboardUser(t, "camila@correo.com", "Camila Rojas");
	return {
		t,
		user,
		profile: () => user.as.query(api.profiles.myProfile, {}),
		startTrial: () => user.as.mutation(api.profiles.startTrial, {}),
	};
}

test("a new person is on Gratis, with the trial available and the welcome unseen", async () => {
	const { user, profile } = await newUser();
	expect(await profile()).toMatchObject({
		hasPlus: false,
		trialAvailable: true,
		welcomeSeen: false,
	});
	await expect(user.as.mutation(api.household.createHousehold, {})).rejects.toThrow(NEED_PLUS);
});

test("asking for the trial gives Plus for 14 days and uses it up", async () => {
	const { user, profile, startTrial } = await newUser();
	expect(await startTrial()).toEqual({ status: "active", trialEndsAt: TRIAL_END });
	expect(await profile()).toMatchObject({ hasPlus: true, trialAvailable: false });
	await expect(user.as.mutation(api.household.createHousehold, {})).resolves.toMatchObject({
		code: expect.any(String),
	});
});

test("asking again during the trial keeps the same end", async () => {
	const { startTrial } = await newUser();
	expect(await Promise.all([startTrial(), startTrial()])).toEqual([
		{ status: "active", trialEndsAt: TRIAL_END },
		{ status: "active", trialEndsAt: TRIAL_END },
	]);
	vi.setSystemTime(NOW + DAY);
	expect(await startTrial()).toEqual({ status: "active", trialEndsAt: TRIAL_END });
});

test("a lapsed trial is not given again", async () => {
	const { profile, startTrial } = await newUser();
	await startTrial();
	vi.setSystemTime(TRIAL_END);
	expect(await startTrial()).toEqual({ status: "used" });
	expect(await profile()).toMatchObject({ hasPlus: false, trialAvailable: false });
});

test("someone who already paid gets no trial, even after the subscription ended", async () => {
	const { t, user, profile, startTrial } = await newUser();
	await subscribe(t, user.userId);
	expect(await profile()).toMatchObject({ hasPlus: true, trialAvailable: false });
	expect(await startTrial()).toEqual({ status: "used" });

	vi.setSystemTime(NOW + 31 * DAY);
	expect(await profile()).toMatchObject({ hasPlus: true, trialAvailable: false });
	await subscribe(t, user.userId, {
		status: "canceled",
		currentPeriodEnd: new Date(NOW + 30 * DAY).toISOString(),
	});
	expect(await profile()).toMatchObject({ hasPlus: false, trialAvailable: false });
	expect(await startTrial()).toEqual({ status: "used" });
	expect((await profile())?.hasPlus).toBe(false);
});

test("an account that had the old automatic trial counts it as used", async () => {
	const { t, user, profile, startTrial } = await newUser();
	await setTrialEnd(t, user.userId, NOW - DAY);
	expect((await profile())?.trialAvailable).toBe(false);
	expect(await startTrial()).toEqual({ status: "used" });
	expect((await profile())?.hasPlus).toBe(false);
});

test("the welcome stays seen once it is closed", async () => {
	const { user, profile } = await newUser();
	await user.as.mutation(api.profiles.markWelcomeSeen, {});
	expect((await profile())?.welcomeSeen).toBe(true);
	await user.as.mutation(api.profiles.markWelcomeSeen, {});
	expect((await profile())?.welcomeSeen).toBe(true);
});

test("without a session there is no trial and no welcome to mark", async () => {
	const t = harness();
	await expect(t.mutation(api.profiles.startTrial, {})).rejects.toThrow("Unauthenticated");
	await expect(t.mutation(api.profiles.markWelcomeSeen, {})).rejects.toThrow("Unauthenticated");
});
