import { safeRedirect } from "./household";

export const NEED_PLUS = "Esto requiere Quipu Plus.";

export const FREE_PERSONAL_GOAL_CAP = 2;

export type Interval = "month" | "year";

type Offer = {
	productId: string;
	interval: Interval;
	prices: { currency: string; amountCents: number }[];
};

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
