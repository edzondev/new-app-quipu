import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { NEED_PLUS, showTrialReminder } from "../shared/billing";
import { DAY, type Harness, harness, onboardUser, setTrialEnd, START, subscribe } from "./couple";

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
		plusHistory: "none",
		welcomeSeen: false,
		trialEndedSeen: false,
	});
	await expect(user.as.mutation(api.household.createHousehold, {})).rejects.toThrow(NEED_PLUS);
});

test("asking for the trial gives Plus for 14 days and uses it up", async () => {
	const { user, profile, startTrial } = await newUser();
	expect(await startTrial()).toEqual({ status: "active", trialEndsAt: TRIAL_END });
	expect(await profile()).toMatchObject({ hasPlus: true, plusHistory: "trial" });
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
	expect(await profile()).toMatchObject({ hasPlus: false, plusHistory: "trial" });
});

test("someone who already paid gets no trial, even after the subscription ended", async () => {
	const { t, user, profile, startTrial } = await newUser();
	await subscribe(t, user.userId);
	expect(await profile()).toMatchObject({ hasPlus: true, plusHistory: "paid" });
	expect(await startTrial()).toEqual({ status: "used" });

	vi.setSystemTime(NOW + 31 * DAY);
	expect(await profile()).toMatchObject({ hasPlus: true, plusHistory: "paid" });
	await subscribe(t, user.userId, {
		status: "canceled",
		currentPeriodEnd: new Date(NOW + 30 * DAY).toISOString(),
	});
	expect(await profile()).toMatchObject({ hasPlus: false, plusHistory: "paid" });
	expect(await startTrial()).toEqual({ status: "used" });
	expect((await profile())?.hasPlus).toBe(false);
});

test("a subscription that was never charged does not use up the trial", async () => {
	const { t, user, profile, startTrial } = await newUser();
	await subscribe(t, user.userId, { status: "incomplete_expired" });
	expect(await profile()).toMatchObject({ hasPlus: false, plusHistory: "none" });
	expect(await startTrial()).toEqual({ status: "active", trialEndsAt: TRIAL_END });
	expect(await profile()).toMatchObject({ hasPlus: true, plusHistory: "trial" });
});

test("an account that had the old automatic trial counts it as used", async () => {
	const { t, user, profile, startTrial } = await newUser();
	await setTrialEnd(t, user.userId, NOW - DAY);
	expect((await profile())?.plusHistory).toBe("trial");
	expect(await startTrial()).toEqual({ status: "used" });
	expect((await profile())?.hasPlus).toBe(false);
});

test("a subscription after the trial makes the history paid", async () => {
	const { t, user, profile, startTrial } = await newUser();
	await startTrial();
	vi.setSystemTime(TRIAL_END);
	await subscribe(t, user.userId, {
		status: "canceled",
		currentPeriodEnd: new Date(TRIAL_END - DAY).toISOString(),
	});
	expect(await profile()).toMatchObject({ hasPlus: false, plusHistory: "paid" });
});

// Reads when it was closed: a second close on another device must keep the first one.
async function seenAt(t: Harness, userId: string) {
	return await t.run(async (ctx) => {
		const row = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
		return {
			welcome: row?.welcomeSeenAt,
			trialEnded: row?.trialEndedSeenAt,
			reminder: row?.trialReminderSeenAt,
		};
	});
}

test("the welcome is marked once and stays seen", async () => {
	const { t, user, profile } = await newUser();
	await user.as.mutation(api.profiles.markWelcomeSeen, {});
	expect(await profile()).toMatchObject({ welcomeSeen: true, trialEndedSeen: false });
	vi.setSystemTime(NOW + DAY);
	await user.as.mutation(api.profiles.markWelcomeSeen, {});
	expect(await seenAt(t, user.userId)).toEqual({
		welcome: NOW,
		trialEnded: undefined,
		reminder: undefined,
	});
});

test("the trial-ended notice is marked once and stays seen", async () => {
	const { t, user, profile } = await newUser();
	await user.as.mutation(api.profiles.markTrialEndedSeen, {});
	expect(await profile()).toMatchObject({ trialEndedSeen: true, welcomeSeen: false });
	vi.setSystemTime(NOW + DAY);
	await user.as.mutation(api.profiles.markTrialEndedSeen, {});
	expect(await seenAt(t, user.userId)).toEqual({
		welcome: undefined,
		trialEnded: NOW,
		reminder: undefined,
	});
});

test("the trial reminder is marked once and stays seen", async () => {
	const { t, user, profile } = await newUser();
	await user.as.mutation(api.profiles.markTrialReminderSeen, {});
	expect(await profile()).toMatchObject({ trialReminderSeen: true, trialEndedSeen: false });
	vi.setSystemTime(NOW + DAY);
	await user.as.mutation(api.profiles.markTrialReminderSeen, {});
	expect(await seenAt(t, user.userId)).toEqual({
		welcome: undefined,
		trialEnded: undefined,
		reminder: NOW,
	});
});

// The client passes its own clock; the reminder only reads the profile.
async function reminderAt(
	read: () => Promise<Parameters<typeof showTrialReminder>[0] | null>,
	at: number,
) {
	vi.setSystemTime(at);
	const data = await read();
	return data !== null && showTrialReminder(data, at);
}

test("the reminder shows in the last 2 days of the trial, not before and not after", async () => {
	const { profile, startTrial } = await newUser();
	expect(await reminderAt(profile, NOW)).toBe(false);
	await startTrial();
	expect(await profile()).toMatchObject({ trialEndsAt: TRIAL_END, trialReminderSeen: false });
	expect(await reminderAt(profile, TRIAL_END - 3 * DAY)).toBe(false);
	expect(await reminderAt(profile, TRIAL_END - 2 * DAY)).toBe(true);
	expect(await reminderAt(profile, TRIAL_END - 1)).toBe(true);
	expect(await reminderAt(profile, TRIAL_END)).toBe(false);
});

test("the reminder does not show once it was seen", async () => {
	const { user, profile, startTrial } = await newUser();
	await startTrial();
	vi.setSystemTime(TRIAL_END - 2 * DAY);
	await user.as.mutation(api.profiles.markTrialReminderSeen, {});
	expect(await reminderAt(profile, TRIAL_END - DAY)).toBe(false);
});

test("the reminder does not show to someone who subscribed during the trial", async () => {
	const { t, user, profile, startTrial } = await newUser();
	await startTrial();
	await subscribe(t, user.userId);
	expect(await reminderAt(profile, TRIAL_END - DAY)).toBe(false);
});

test("without a session there is no trial and no notice to mark", async () => {
	const t = harness();
	await expect(t.mutation(api.profiles.startTrial, {})).rejects.toThrow("Unauthenticated");
	await expect(t.mutation(api.profiles.markWelcomeSeen, {})).rejects.toThrow("Unauthenticated");
	await expect(t.mutation(api.profiles.markTrialEndedSeen, {})).rejects.toThrow("Unauthenticated");
	await expect(t.mutation(api.profiles.markTrialReminderSeen, {})).rejects.toThrow(
		"Unauthenticated",
	);
});
