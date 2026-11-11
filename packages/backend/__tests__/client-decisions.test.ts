/**
 * The pure decisions behind the web's redirects, trial reminder, invite sharing and lists,
 * without a DOM. NOT covered here: the real sign-in and its page reload, the share menu and the
 * clipboard of a real browser, the timers of a sleeping tab, and where the toast sits on screen.
 * Those are in the manual checklist of the PR.
 */
import { describe, expect, test } from "vitest";
import { showTrialReminder, trialReminderMoments } from "../shared/billing";
import { type CommitmentStatus, groupCommitments } from "../shared/commitments";
import { cycleNames, delayUntil, MAX_DELAY_MS, nextMoment } from "../shared/dates";
import { safeRedirect, shareFailure } from "../shared/household";

describe("safeRedirect, as reloadTo and the auth routes use it", () => {
	test("keeps internal paths with their query and hash as they are", () => {
		for (const path of [
			"/home",
			"/onboarding?redirect=%2Funirme%2FK7Q2MX",
			"/movements?space=household#hoy",
			"/unirme/K7Q2MX",
		]) {
			expect(safeRedirect(path)).toBe(path);
		}
	});

	test("sends to Inicio whatever a browser could read as another host", () => {
		for (const value of [
			"/\t/evil.com",
			"/\n/evil.com",
			"/\r/evil.com",
			"\t//evil.com",
			"/\\evil.com",
			"/home\\..\\\\evil.com",
			"//evil.com/home",
			"//quipu.invalid/home",
			"//[",
			"///evil.com",
			"/\u0000/evil.com",
			"https://evil.com/home",
			"javascript:alert(1)",
			" /home",
		]) {
			expect(safeRedirect(value)).toBe("/home");
		}
	});
});

describe("trial reminder clock", () => {
	const END = Date.UTC(2026, 10, 3, 17);
	const HOUR = 60 * 60 * 1000;
	const profile = { trialEndsAt: END, plusHistory: "trial" as const, trialReminderSeen: false };

	test("the clock wakes at the start of the last 48 hours and at the end, and then stops", () => {
		const moments = trialReminderMoments(END);
		expect(nextMoment(moments, END - 72 * HOUR)).toBe(END - 48 * HOUR);
		expect(nextMoment(moments, END - 48 * HOUR)).toBe(END);
		expect(nextMoment(moments, END)).toBeNull();
	});

	test("at each moment the clock wakes, the reminder changes", () => {
		const [starts, ends] = trialReminderMoments(END);
		expect(showTrialReminder(profile, starts - 1)).toBe(false);
		expect(showTrialReminder(profile, starts)).toBe(true);
		expect(showTrialReminder(profile, ends - 1)).toBe(true);
		expect(showTrialReminder(profile, ends)).toBe(false);
	});

	test("the wait is measured from when it is scheduled, lands just after, and never passes the cap", () => {
		expect(delayUntil(END, END - HOUR)).toBe(HOUR + 50);
		// Scheduled late: a moment already gone fires right away, not with a negative delay.
		expect(delayUntil(END, END + HOUR)).toBe(50);
		expect(delayUntil(END, END - 30 * 24 * HOUR)).toBe(MAX_DELAY_MS);
		expect(delayUntil(END, END - MAX_DELAY_MS)).toBe(MAX_DELAY_MS);
	});

	test("nothing ahead means no timer at all", () => {
		expect(nextMoment([], END)).toBeNull();
		expect(nextMoment([END - 1, END], END)).toBeNull();
	});
});

describe("sharing an invite", () => {
	test("closing the share menu is a cancel: no toast and no copy", () => {
		expect(shareFailure(new DOMException("Share canceled", "AbortError"))).toBe("cancelled");
	});

	test("a blocked or failed menu counts as no menu, so the link is copied instead", () => {
		for (const error of [
			new DOMException("Not allowed", "NotAllowedError"),
			new DOMException("Bad data", "DataError"),
			new TypeError("share is not a function"),
			"oops",
			null,
		]) {
			expect(shareFailure(error)).toBe("unavailable");
		}
	});
});

describe("groupCommitments", () => {
	test("puts every status in its list and keeps the order they came in", () => {
		const items: { name: string; status: CommitmentStatus }[] = [
			{ name: "Luz", status: "overdue" },
			{ name: "Agua", status: "paid" },
			{ name: "Netflix", status: "later" },
			{ name: "Gas", status: "upcoming" },
			{ name: "Internet", status: "reserved" },
			{ name: "Alquiler", status: "paid" },
			{ name: "Seguro", status: "later" },
		];
		const names = (list: typeof items) => list.map((item) => item.name);
		const groups = groupCommitments(items);
		expect(names(groups.pending)).toEqual(["Luz", "Gas", "Internet"]);
		expect(names(groups.later)).toEqual(["Netflix", "Seguro"]);
		expect(names(groups.paidBefore)).toEqual(["Agua", "Alquiler"]);
	});

	test("no items give three empty lists", () => {
		expect(groupCommitments([])).toEqual({ pending: [], later: [], paidBefore: [] });
	});
});

describe("cycleNames, for Registrar's early salary", () => {
	test("a cycle that ends with its month is named by month, as before", () => {
		expect(cycleNames("2026-10-31")).toEqual({
			nextStart: "2026-11-01",
			current: "lo que queda de octubre",
			next: "noviembre",
		});
	});

	test("a quincena that ends on the 15th is told by its real dates, not by the month", () => {
		expect(cycleNames("2026-10-15")).toEqual({
			nextStart: "2026-10-16",
			current: "lo que queda, hasta el 15 oct",
			next: "el próximo ciclo",
		});
	});
});
