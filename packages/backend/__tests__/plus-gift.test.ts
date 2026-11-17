import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { GIFT_MS, NEED_PLUS, planCard, TRIAL_MS } from "../shared/billing";
import { DAY, type Harness, harness, onboardUser, START, TODAY } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const NOW = Date.parse(START);
const GIFT_END = NOW + GIFT_MS;

async function setGiftEnd(t: Harness, userId: string, giftEndsAt: number) {
	await t.run(async (ctx) => {
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
		if (!profile) throw new Error("missing profile");
		await ctx.db.patch("profiles", profile._id, { giftEndsAt });
	});
}

/** Camila on Gratis with the gift running to `giftEndsAt`, and two goals already. */
async function giftedUser(giftEndsAt = GIFT_END) {
	const t = harness();
	const user = await onboardUser(t, "camila@correo.com", "Camila Rojas");
	await setGiftEnd(t, user.userId, giftEndsAt);
	const addGoal = (name: string) =>
		user.as.mutation(api.goals.add, { space: "personal", name, targetCents: 50_000 });
	await addGoal("Viaje");
	await addGoal("Laptop");
	return {
		t,
		user,
		addGoal,
		profile: () => user.as.query(api.profiles.myProfile, {}),
		status: () => user.as.query(api.billing.status, {}),
	};
}

test("the gift gives Plus without using up the trial", async () => {
	const { profile, status, addGoal } = await giftedUser();
	expect(await profile()).toMatchObject({ hasPlus: true, plusHistory: "none", trialEndsAt: null });
	expect(await status()).toEqual({ kind: "gift", endsAt: GIFT_END });
	await expect(addGoal("Curso")).resolves.toBeNull();
});

test("the gift lasts 90 days from the moment it is given", async () => {
	const { profile } = await giftedUser();
	vi.setSystemTime(GIFT_END - 1);
	expect(await profile()).toMatchObject({ hasPlus: true });
	vi.setSystemTime(GIFT_END);
	expect(await profile()).toMatchObject({ hasPlus: false });
	expect(GIFT_MS).toBe(90 * DAY);
});

test("when the gift ends the person is on Gratis and a third goal needs Plus", async () => {
	const { profile, status, addGoal } = await giftedUser(NOW - 1);
	expect(await profile()).toMatchObject({ hasPlus: false, plusHistory: "none" });
	expect(await status()).toEqual({ kind: "free" });
	await expect(addGoal("Curso")).rejects.toThrow(NEED_PLUS);
});

test("during the gift the trial cannot be asked for, and trialEndsAt stays empty", async () => {
	const { t, user, profile } = await giftedUser();
	await expect(user.as.mutation(api.profiles.startTrial, {})).rejects.toThrow(
		"Ya tienes Plus de regalo.",
	);
	const stored = await t.run((ctx) =>
		ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", user.userId))
			.unique(),
	);
	expect(stored?.trialEndsAt).toBeUndefined();
	expect(await profile()).toMatchObject({ hasPlus: true, plusHistory: "none" });
});

test("after the gift the 14-day trial is still there to ask for", async () => {
	const { user, profile } = await giftedUser(NOW - 1);
	expect(await user.as.mutation(api.profiles.startTrial, {})).toEqual({
		status: "active",
		trialEndsAt: NOW + TRIAL_MS,
	});
	expect(await profile()).toMatchObject({ hasPlus: true, plusHistory: "trial" });
});

test("a gift alone lets the person create their household", async () => {
	const { user } = await giftedUser();
	await expect(user.as.mutation(api.household.createHousehold, {})).resolves.toMatchObject({
		code: expect.any(String),
	});
});

test("Tu plan says until when the gift lasts and that nothing is charged", () => {
	expect(planCard({ kind: "gift", endsAt: Date.parse("2027-01-18T17:00:00.000Z") }, TODAY)).toEqual(
		{
			title: "Plus de regalo",
			line: "Hasta el 18 ene 2027. No te cobramos nada.",
			action: { label: "Ver planes", to: "plans" },
		},
	);
});
