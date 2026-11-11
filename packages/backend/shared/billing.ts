import { type Infer, v } from "convex/values";
import { formatCents } from "./budget";
import { daysBetween, formatDaysLeft, formatPastDay, getLimaDate } from "./dates";
import { safeRedirect } from "./household";

export const NEED_PLUS = "Esto requiere Quipu Plus.";

export const FREE_PERSONAL_GOAL_CAP = 2;

export const intervalValidator = v.union(v.literal("month"), v.literal("year"));
export type Interval = Infer<typeof intervalValidator>;

export function toInterval(recurringInterval: string | null | undefined) {
	return recurringInterval === "month" || recurringInterval === "year" ? recurringInterval : null;
}

/** Where the Plus a person ever had came from. */
export type PlusHistory = "none" | "trial" | "paid";

const interval = v.union(intervalValidator, v.null());
const orNull = v.union(v.number(), v.null());

/** What billing.status returns: no Polar ids, and of the partner only a first name. */
export const plusStatusValidator = v.union(
	v.object({ kind: v.literal("free") }),
	v.object({ kind: v.literal("trial"), endsAt: v.number() }),
	v.object({ kind: v.literal("trialEnded") }),
	v.object({
		kind: v.literal("paid"),
		interval,
		amountCents: orNull,
		renewsAt: orNull,
	}),
	v.object({
		kind: v.literal("ending"),
		interval,
		endsAt: orNull,
	}),
	v.object({ kind: v.literal("pastDue"), interval: interval }),
	v.object({ kind: v.literal("household"), payerName: v.string(), payerOnTrial: v.boolean() }),
	v.object({ kind: v.literal("lapsed"), payerIsMe: v.boolean() }),
);
export type PlusStatus = Infer<typeof plusStatusValidator>;

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

const MONTH_OR_YEAR = { month: "al mes", year: "al año" };
const PLUS_TITLE = { month: "Plus mensual", year: "Plus anual" };

type PlanAction = { label: string; to: "plans" | "portal" };
export type PlanCard = { title: string; line: string; action: PlanAction | null };

const plans = (label: string): PlanAction => ({ label, to: "plans" });
const portal = (label: string): PlanAction => ({ label, to: "portal" });

const limaDay = (ms: number, today: string) => formatPastDay(getLimaDate(new Date(ms)), today);

/** Everything PW2 and the Ajustes row say about a plan: one title, one line, at most one action. */
export function planCard(status: PlusStatus, today: string): PlanCard {
	const plusTitle = (interval: Interval | null) => (interval ? PLUS_TITLE[interval] : "Quipu Plus");
	switch (status.kind) {
		case "free":
			return { title: "Gratis", line: "Sin límite de tiempo.", action: plans("Ver Plus") };
		case "trial": {
			const days = daysBetween(today, getLimaDate(new Date(status.endsAt)));
			return {
				title: days <= 0 ? "En prueba · termina hoy" : `En prueba · ${formatDaysLeft(days)}`,
				line: `Termina el ${limaDay(status.endsAt, today)}. No te cobramos nada.`,
				action: plans("Ver planes"),
			};
		}
		case "trialEnded":
			return {
				title: "Tu prueba de Plus terminó",
				line: "Volviste al plan Gratis. No se borró nada.",
				action: plans("Suscribirme"),
			};
		case "paid": {
			const parts = [
				status.amountCents !== null && status.interval
					? `S/ ${formatCents(status.amountCents)} ${MONTH_OR_YEAR[status.interval]}`
					: null,
				status.renewsAt === null ? null : `Renueva el ${limaDay(status.renewsAt, today)}`,
			].filter(Boolean);
			return {
				title: plusTitle(status.interval),
				line: parts.length > 0 ? `${parts.join(" · ")}.` : "",
				action: portal("Administrar suscripción"),
			};
		}
		case "ending":
			return {
				title: plusTitle(status.interval),
				line: `${status.endsAt === null ? "Se cancela al terminar el periodo." : `Se cancela el ${limaDay(status.endsAt, today)}.`} Sigues con Plus hasta entonces.`,
				action: portal("Administrar suscripción"),
			};
		case "pastDue":
			return {
				title: plusTitle(status.interval),
				line: "No pudimos cobrar tu pago. Actualiza tu tarjeta para seguir con Plus.",
				action: portal("Actualizar pago"),
			};
		case "household":
			return {
				title: "Plus del hogar",
				line: `${status.payerName} ${status.payerOnTrial ? "tiene" : "paga"} Quipu Plus. Tú entras gratis.`,
				action: null,
			};
		case "lapsed":
			return {
				title: "Gratis",
				line: "Tu Plus terminó. Lo de Plus queda en solo lectura; tus datos no se borran.",
				action: plans(status.payerIsMe ? "Renovar Plus" : "Pagar yo"),
			};
	}
}

/** The second line of the «Quipu Plus» row in Ajustes: the plan title, but a paid plan says it is active. */
export function planRowLine(status: PlusStatus, today: string) {
	if (status.kind !== "paid") return planCard(status, today).title;
	return status.renewsAt === null
		? "Activo"
		: `Activo · se renueva el ${limaDay(status.renewsAt, today)}`;
}

/** The checkout is confirmed by a subscription of one's own: not a trial, not the partner's Plus. */
export function isOwnPurchase(status: PlusStatus) {
	return status.kind === "paid" || status.kind === "ending" || status.kind === "pastDue";
}
