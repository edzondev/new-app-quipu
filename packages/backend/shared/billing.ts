import { type Infer, v } from "convex/values";
import { safeRedirect } from "./household";

export const NEED_PLUS = "Esto requiere Quipu Plus.";

export const FREE_PERSONAL_GOAL_CAP = 2;

export const intervalValidator = v.union(v.literal("month"), v.literal("year"));
export type Interval = Infer<typeof intervalValidator>;

/** Where the Plus a person ever had came from. */
export type PlusHistory = "none" | "trial" | "paid";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Our Plus trial: 14 days, no card. */
export const TRIAL_MS = 14 * DAY_MS;

const TRIAL_REMINDER_MS = 2 * DAY_MS;

/** When showTrialReminder can change on its own: the reminder starts, and the trial ends. */
export function trialReminderMoments(trialEndsAt: number) {
	return [trialEndsAt - TRIAL_REMINDER_MS, trialEndsAt];
}

type ReminderProfile = {
	trialEndsAt: number | null;
	plusHistory: PlusHistory;
	trialReminderSeen: boolean;
};

/** Inicio says the trial is about to end once, in its last 2 days, unless the person already pays. */
export function showTrialReminder<T extends ReminderProfile>(
	profile: T,
	now: number,
): profile is T & { trialEndsAt: number } {
	return (
		profile.trialEndsAt !== null &&
		now < profile.trialEndsAt &&
		profile.trialEndsAt - now <= TRIAL_REMINDER_MS &&
		profile.plusHistory !== "paid" &&
		!profile.trialReminderSeen
	);
}

/** A Plus plan as billing.offer returns it: the one definition, for the validator and the type. */
export const offerValidator = v.object({
	productId: v.string(),
	interval: intervalValidator,
	prices: v.array(v.object({ currency: v.string(), amountCents: v.number() })),
});
export type Offer = Infer<typeof offerValidator>;

export function findOffer<T extends Offer>(offers: T[], interval: Interval, currency: string) {
	return offers.find(
		(offer) =>
			offer.interval === interval && offer.prices.some((price) => price.currency === currency),
	);
}

export function planPrices(offers: Offer[]): Record<Interval, number | null> {
	const pen = (interval: Interval) =>
		findOffer(offers, interval, "pen")?.prices.find((price) => price.currency === "pen")
			?.amountCents ?? null;
	return { month: pen("month"), year: pen("year") };
}

export function annualSavings(prices: Record<Interval, number | null>) {
	if (prices.month === null || prices.year === null) return null;
	const savings = 12 * prices.month - prices.year;
	return savings > 0 ? savings : null;
}

export function monthlyEquivalent(yearCents: number) {
	return Math.round(yearCents / 12);
}

const MAX_RETURN_PATH = 512;

/**
 * An absolute URL on the site for a path the client sent. Only internal paths: whatever the
 * browser would read as another host (like "/\t/evil.com", which becomes "//evil.com") goes to Inicio.
 */
export function returnUrl(siteUrl: string, path: string, params: Record<string, string> = {}) {
	const { origin } = new URL(siteUrl);
	const parsed = new URL(path.length > MAX_RETURN_PATH ? "/home" : safeRedirect(path), origin);
	const url = parsed.origin === origin ? parsed : new URL("/home", origin);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	return url.toString();
}
