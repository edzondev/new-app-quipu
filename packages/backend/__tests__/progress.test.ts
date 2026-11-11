import polarTest from "@convex-dev/polar/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import { closeCycle } from "../convex/model/cycles";
import schema from "../convex/schema";
import { addDays } from "../shared/dates";

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");

function harness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
	polarTest.register(t);
	resendTest.register(t);
	rateLimiterTest.register(t);
	return t;
}

function post(t: ReturnType<typeof harness>, path: string, body: object) {
	return t.fetch(`/api/auth${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: "http://localhost:3000" },
		body: JSON.stringify(body),
	});
}

async function sendCode(t: ReturnType<typeof harness>, email: string) {
	process.env.OTP_DELIVERY = "log";
	process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
	const lines: string[] = [];
	const log = console.log;
	console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
	try {
		const sent = await post(t, "/email-otp/send-verification-otp", { email, type: "sign-in" });
		expect(sent.ok, await sent.clone().text()).toBe(true);
	} finally {
		console.log = log;
	}
	return lines.find((l) => l.startsWith(`OTP ${email}: `))?.slice(`OTP ${email}: `.length);
}

async function signIn(t: ReturnType<typeof harness>, email: string, name: string) {
	const otp = await sendCode(t, email);
	const res = await post(t, "/sign-in/email-otp", { email, otp, name });
	expect(res.status, await res.clone().text()).toBe(200);
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	const session = await t.query(components.betterAuth.adapter.findOne, {
		model: "session",
		where: [{ field: "userId", value: user._id }],
	});
	return t.withIdentity({ subject: user._id, sessionId: session._id });
}

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: { needs: 50, wants: 30, savings: 20 },
};

type Ana = Awaited<ReturnType<typeof signIn>>;

// Sign in under the fake clock, then stretch the session (7 days) to reach 2027.
async function startAna(t: ReturnType<typeof harness>, plan = onboard) {
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const ana = await signIn(t, "ana@correo.com", "Ana");
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: "ana@correo.com" }],
	});
	await t.mutation(components.betterAuth.adapter.updateOne, {
		input: {
			model: "session",
			where: [{ field: "userId", value: user._id }],
			update: { expiresAt: Date.UTC(2028, 0, 1) },
		},
	});
	await ana.mutation(api.profiles.completeOnboarding, { ...plan, name: "Ana" });
	return ana;
}

function at(day: string) {
	vi.setSystemTime(new Date(`${day}T17:00:00.000Z`));
}

async function closeOn(ana: Ana, day: string) {
	at(day);
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
}

async function spend(ana: Ana, day: string, envelope: "needs" | "wants", amountCents: number) {
	at(day);
	await ana.mutation(api.transactions.addExpense, { space: "personal", amountCents, envelope });
}

/** Every page of the history, following `next` until the end. */
async function readHistory(ana: Ana) {
	const cycles = [];
	let hidden = 0;
	let pages = 0;
	let before: string | undefined;
	for (;;) {
		const page = await ana.query(api.progress.list, before === undefined ? {} : { before });
		cycles.push(...page.cycles);
		hidden += page.hidden;
		pages += 1;
		if (page.next === null) return { cycles, hidden, pages };
		before = page.next;
	}
}

// Old, closed cycles inserted straight into the database: week i starts BASE + 7 * i days.
const BASE = "2010-01-04";
const weekStart = (i: number) => addDays(BASE, 7 * i);
const newestFirst = (count: number) =>
	Array.from({ length: count }, (_, k) => weekStart(count - 1 - k));

async function insertClosed(
	t: ReturnType<typeof harness>,
	count: number,
	left: (i: number) => { needsCents: number; wantsCents: number },
) {
	await t.run(async (ctx) => {
		const space = await ctx.db.query("spaces").first();
		if (!space) throw new Error("sin espacio");
		for (let i = 0; i < count; i++) {
			await ctx.db.insert("cycles", {
				spaceId: space._id,
				startDate: weekStart(i),
				endDate: addDays(weekStart(i), 6),
				closedAt: Date.now(),
				split: onboard.split,
				envelopes: { ...left(i), savingsCents: 0 },
				carryIn: { needsCents: 0, wantsCents: 0 },
			});
		}
	});
}

const idle = () => ({ needsCents: 0, wantsCents: 0 });
const positive = () => ({ needsCents: 1, wantsCents: 0 });

/** The oldest cycle of the only space in the database (Ana's first one). */
function firstCycle(t: ReturnType<typeof harness>) {
	return t.run(async (ctx) => {
		const space = await ctx.db.query("spaces").first();
		if (!space) throw new Error("sin espacio");
		const cycle = await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", space._id))
			.first();
		if (!cycle) throw new Error("sin ciclo");
		return { space, cycle };
	});
}

const october = (rest: object) => ({
	id: expect.any(String),
	startDate: "2026-10-20",
	endDate: "2026-10-31",
	...rest,
});

// October: Ana enters S/ 500 on 20 Oct, 50/30/20 → Necesidades 25_000, Gustos 15_000, Ahorro 10_000.

test("two valid closes give a streak of 2 and exact amounts per envelope", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, "2026-10-25", "needs", 10_000);
	await closeOn(ana, "2026-11-01");
	// November starts with October's leftover (15_000 + 15_000), then gets S/ 200 (10_000 / 6_000 / 4_000).
	at("2026-11-12");
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 20_000 });
	await spend(ana, "2026-11-15", "wants", 5_000);
	await closeOn(ana, "2026-12-01");

	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 2,
		exact: true,
		hasActive: true,
	});
	expect(await ana.query(api.progress.list, {})).toEqual({
		hidden: 0,
		next: null,
		cycles: [
			{
				id: expect.any(String),
				startDate: "2026-11-01",
				endDate: "2026-11-30",
				marginCents: 41_000,
				left: { needsCents: 25_000, wantsCents: 16_000 },
				detail: {
					kind: "ok",
					assigned: { needsCents: 25_000, wantsCents: 21_000 },
					spent: { needsCents: 0, wantsCents: 5_000 },
					fundedCents: 4_000,
				},
			},
			october({
				marginCents: 30_000,
				left: { needsCents: 15_000, wantsCents: 15_000 },
				detail: {
					kind: "ok",
					assigned: { needsCents: 25_000, wantsCents: 15_000 },
					spent: { needsCents: 10_000, wantsCents: 0 },
					fundedCents: 10_000,
				},
			}),
		],
	});
});

test("Necesidades −20 and Gustos +50 leave +30: the cycle counts even though one envelope went over", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, "2026-10-25", "needs", 27_000);
	await spend(ana, "2026-10-25", "wants", 10_000);
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles).toEqual([
		october({
			marginCents: 3_000,
			left: { needsCents: -2_000, wantsCents: 5_000 },
			detail: {
				kind: "ok",
				assigned: { needsCents: 25_000, wantsCents: 15_000 },
				spent: { needsCents: 27_000, wantsCents: 10_000 },
				fundedCents: 10_000,
			},
		}),
	]);
	expect(await ana.query(api.progress.streak, {})).toMatchObject({ streak: 1, exact: true });
});

test("a cycle that spends exactly everything has margin 0 and still counts", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, "2026-10-25", "needs", 25_000);
	await spend(ana, "2026-10-25", "wants", 15_000);
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles).toHaveLength(1);
	expect(cycles[0]).toMatchObject({ marginCents: 0, detail: { kind: "ok", fundedCents: 10_000 } });
	expect(await ana.query(api.progress.streak, {})).toMatchObject({ streak: 1, hasActive: true });
});

test("a negative margin cuts the streak and Ahorro does not make up for it", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, "2026-10-25", "needs", 45_000);
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles[0]).toMatchObject({
		marginCents: -5_000,
		left: { needsCents: -20_000, wantsCents: 15_000 },
		detail: { kind: "ok", fundedCents: 10_000 },
	});
	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 0,
		exact: true,
		hasActive: true,
	});
});

test("the streak counts from the latest cycle back and stops at the first cycle that went over", async () => {
	const t = harness();
	const ana = await startAna(t);
	await closeOn(ana, "2026-11-01"); // October: +40_000
	await spend(ana, "2026-11-10", "needs", 50_000); // November: needs −25_000, wants 15_000
	await closeOn(ana, "2026-12-01");
	at("2026-12-05");
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 100_000 });
	await closeOn(ana, "2027-01-01"); // December: needs 25_000, wants 45_000

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles.map((cycle) => cycle.marginCents)).toEqual([70_000, -10_000, 40_000]);
	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 1,
		exact: true,
		hasActive: true,
	});
});

test("when the latest cycle went over the streak is 0 but the history is still listed", async () => {
	const t = harness();
	const ana = await startAna(t);
	await closeOn(ana, "2026-11-01");
	await spend(ana, "2026-11-10", "needs", 50_000);
	await closeOn(ana, "2026-12-01");

	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 0,
		exact: true,
		hasActive: true,
	});
	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles.map((cycle) => cycle.marginCents)).toEqual([-10_000, 40_000]);
});

test("cycles with no activity are hidden and neither add to the streak nor cut it", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, "2026-10-25", "needs", 25_000);
	await spend(ana, "2026-10-25", "wants", 15_000);
	// October leaves nothing to carry: November and December pass with no movements.
	await closeOn(ana, "2027-01-05");
	at("2027-01-10");
	await ana.mutation(api.transactions.addIncome, { space: "personal", amountCents: 10_000 });
	await closeOn(ana, "2027-02-01");

	const history = await readHistory(ana);
	expect(history.cycles.map((cycle) => cycle.startDate)).toEqual(["2027-01-01", "2026-10-20"]);
	expect(history.hidden).toBe(2);
	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 2,
		exact: true,
		hasActive: true,
	});
});

test("a negative carry with no movements is not idle: it shows with its negative assigned and cuts the streak", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, "2026-10-25", "needs", 45_000);
	await closeOn(ana, "2026-12-01");

	const { cycles, hidden } = await ana.query(api.progress.list, {});
	expect(hidden).toBe(0);
	expect(cycles[0]).toMatchObject({
		startDate: "2026-11-01",
		marginCents: -5_000,
		detail: {
			kind: "ok",
			assigned: { needsCents: -20_000, wantsCents: 15_000 },
			spent: { needsCents: 0, wantsCents: 0 },
			fundedCents: 0,
		},
	});
	expect(await ana.query(api.progress.streak, {})).toMatchObject({ streak: 0 });
});

test("a positive carry with no movements is not idle: it shows and adds to the streak", async () => {
	const t = harness();
	const ana = await startAna(t);
	await closeOn(ana, "2026-12-01");

	const { cycles, hidden } = await ana.query(api.progress.list, {});
	expect(hidden).toBe(0);
	expect(cycles[0]).toMatchObject({
		startDate: "2026-11-01",
		marginCents: 40_000,
		detail: {
			kind: "ok",
			assigned: { needsCents: 25_000, wantsCents: 15_000 },
			spent: { needsCents: 0, wantsCents: 0 },
			fundedCents: 0,
		},
	});
	expect(await ana.query(api.progress.streak, {})).toMatchObject({ streak: 2 });
});

test("a carry that nets to zero (−50 and +50) is still a carry: the cycle is not idle", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, "2026-10-25", "needs", 30_000);
	await spend(ana, "2026-10-25", "wants", 10_000);
	await closeOn(ana, "2026-12-01");

	const { cycles, hidden } = await ana.query(api.progress.list, {});
	expect(hidden).toBe(0);
	expect(cycles.map((cycle) => cycle.startDate)).toEqual(["2026-11-01", "2026-10-20"]);
	expect(cycles[0]).toMatchObject({
		marginCents: 0,
		detail: {
			kind: "ok",
			assigned: { needsCents: -5_000, wantsCents: 5_000 },
			spent: { needsCents: 0, wantsCents: 0 },
		},
	});
	expect(await ana.query(api.progress.streak, {})).toMatchObject({ streak: 2 });
});

test("no closed cycle yet: empty history that is complete", async () => {
	const t = harness();
	const ana = await startAna(t);

	expect(await ana.query(api.progress.list, {})).toEqual({ cycles: [], hidden: 0, next: null });
	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 0,
		exact: true,
		hasActive: false,
	});
});

test("only cycles with no activity: nothing to show, but it is told apart from no closes at all", async () => {
	const t = harness();
	const ana = await startAna(t, { ...onboard, todayCents: 0 });
	await closeOn(ana, "2026-11-01");

	expect(await ana.query(api.progress.list, {})).toEqual({ cycles: [], hidden: 1, next: null });
	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 0,
		exact: true,
		hasActive: false,
	});
});

test("a cycle closed before summaries existed shows by its margin, without detail, as legacy", async () => {
	const t = harness();
	const ana = await startAna(t);
	await closeOn(ana, "2026-11-01");
	const { cycle } = await firstCycle(t);
	await t.run((ctx) => ctx.db.patch("cycles", cycle._id, { closeSummary: undefined }));

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles).toEqual([
		october({
			marginCents: 40_000,
			left: { needsCents: 25_000, wantsCents: 15_000 },
			detail: { kind: "unavailable", reason: "legacy" },
		}),
	]);
	expect(await ana.query(api.progress.streak, {})).toMatchObject({ streak: 1 });
});

test("old cycles with margin 0 and no carry show only if they had movements", async () => {
	const t = harness();
	const ana = await startAna(t);
	await insertClosed(t, 2, idle);
	await t.run(async (ctx) => {
		const space = await ctx.db.query("spaces").first();
		if (!space) throw new Error("sin espacio");
		const busy = await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", space._id).eq("startDate", weekStart(1)))
			.unique();
		if (!busy) throw new Error("sin ciclo");
		await ctx.db.insert("transactions", {
			kind: "expense",
			spaceId: space._id,
			cycleId: busy._id,
			userId: "someone",
			amountCents: 100,
			date: weekStart(1),
			envelope: "needs",
		});
	});

	const history = await readHistory(ana);
	expect(history.cycles.map((cycle) => cycle.startDate)).toEqual([weekStart(1)]);
	expect(history.hidden).toBe(1);
});

test("more than 500 movements: the close still works, margin and streak are right, the detail says why it is missing", async () => {
	const t = harness();
	const ana = await startAna(t);
	const { space, cycle } = await firstCycle(t);
	await t.run(async (ctx) => {
		for (let i = 0; i < 501; i++) {
			await ctx.db.insert("transactions", {
				kind: "expense",
				spaceId: space._id,
				cycleId: cycle._id,
				userId: "someone",
				amountCents: 1,
				date: "2026-10-21",
				envelope: "needs",
			});
		}
	});
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles).toEqual([
		october({
			marginCents: 40_000,
			left: { needsCents: 25_000, wantsCents: 15_000 },
			detail: { kind: "unavailable", reason: "tooManyMovements" },
		}),
	]);
	expect(await ana.query(api.progress.streak, {})).toMatchObject({ streak: 1 });
});

test("exactly 500 movements keep their detail: the automatic saving of the close is not one of them", async () => {
	const t = harness();
	const ana = await startAna(t);
	const { space, cycle } = await firstCycle(t);
	// Onboarding left one income; 499 expenses of 1 cent make 500.
	await t.run(async (ctx) => {
		for (let i = 0; i < 499; i++) {
			await ctx.db.insert("transactions", {
				kind: "expense",
				spaceId: space._id,
				cycleId: cycle._id,
				userId: "someone",
				amountCents: 1,
				date: "2026-10-21",
				envelope: "needs",
			});
		}
		await ctx.db.patch("cycles", cycle._id, {
			envelopes: { ...cycle.envelopes, needsCents: cycle.envelopes.needsCents - 499 },
		});
	});
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles[0]?.detail).toEqual({
		kind: "ok",
		assigned: { needsCents: 25_000, wantsCents: 15_000 },
		spent: { needsCents: 499, wantsCents: 0 },
		fundedCents: 10_000,
	});
});

test("money that moved outside the records does not block the close and is never passed off as a legacy cycle", async () => {
	const t = harness();
	const ana = await startAna(t);
	const { cycle } = await firstCycle(t);
	await t.run((ctx) =>
		ctx.db.patch("cycles", cycle._id, {
			envelopes: { needsCents: 25_100, wantsCents: 15_000, savingsCents: 10_000 },
		}),
	);
	const logged = vi.spyOn(console, "error").mockImplementation(() => {});

	await closeOn(ana, "2026-11-01");

	// The gap per envelope and the cycle, and nothing the person wrote.
	expect(logged).toHaveBeenCalledWith(expect.any(String), cycle._id, {
		needsCents: 100,
		wantsCents: 0,
	});
	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles).toEqual([
		october({
			marginCents: 40_100,
			left: { needsCents: 25_100, wantsCents: 15_000 },
			detail: { kind: "unavailable", reason: "inconsistent" },
		}),
	]);
	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	expect(home.startDate).toBe("2026-11-01");
});

test("the history comes in pages of 12 and following next reaches every cycle once, newest first", async () => {
	const t = harness();
	const ana = await startAna(t);
	await insertClosed(t, 30, positive);

	const first = await ana.query(api.progress.list, {});
	expect(first.cycles).toHaveLength(12);
	expect(first.next).not.toBeNull();
	const history = await readHistory(ana);
	expect(history.pages).toBe(3);
	expect(history.cycles.map((cycle) => cycle.startDate)).toEqual(newestFirst(30));
	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 30,
		exact: true,
		hasActive: true,
	});
});

test("exactly 12 cycles fill one page and there is no next page", async () => {
	const t = harness();
	const ana = await startAna(t);
	await insertClosed(t, 12, positive);

	const page = await ana.query(api.progress.list, {});
	expect(page.cycles).toHaveLength(12);
	expect(page.next).toBeNull();
});

test("13 cycles give a full page and a last page with the one left, never an empty one", async () => {
	const t = harness();
	const ana = await startAna(t);
	await insertClosed(t, 13, positive);

	const first = await ana.query(api.progress.list, {});
	expect(first.cycles).toHaveLength(12);
	expect(first.next).not.toBeNull();
	const last = await ana.query(api.progress.list, { before: first.next ?? undefined });
	expect(last.cycles.map((cycle) => cycle.startDate)).toEqual([weekStart(0)]);
	expect(last.next).toBeNull();
});

test("a full page followed only by idle cycles is the last page: no empty page after it", async () => {
	const t = harness();
	const ana = await startAna(t);
	// Weeks 0-2 are idle and oldest; weeks 3-14 are the 12 active ones.
	await insertClosed(t, 15, (i) => (i < 3 ? idle() : positive()));

	const page = await ana.query(api.progress.list, {});
	expect(page.cycles).toHaveLength(12);
	expect(page.next).toBeNull();
});

test("a full page whose look-ahead runs out of budget still offers more, and more reaches the cycle", async () => {
	const t = harness();
	const ana = await startAna(t);
	// Week 0 is active and oldest; 100 idle weeks; then the 12 newest active ones.
	await insertClosed(t, 113, (i) => (i === 0 || i > 100 ? positive() : idle()));

	const history = await readHistory(ana);
	expect(history.cycles.map((cycle) => cycle.startDate)).toEqual([
		...newestFirst(113).slice(0, 12),
		weekStart(0),
	]);
	expect(history.hidden).toBe(100);
});

test("a long idle stretch never hides the cycles behind it: later pages reach them", async () => {
	const t = harness();
	const ana = await startAna(t);
	// Weeks 0-4 are active, weeks 5-154 are idle and newer.
	await insertClosed(t, 155, (i) => (i < 5 ? positive() : idle()));

	const first = await ana.query(api.progress.list, {});
	expect(first.cycles).toEqual([]);
	expect(first.next).not.toBeNull();
	const history = await readHistory(ana);
	expect(history.cycles.map((cycle) => cycle.startDate)).toEqual(newestFirst(5));
	expect(history.hidden).toBe(150);
	expect(history.pages).toBeGreaterThan(1);
});

test("a malformed cursor is rejected and a cursor before the first cycle gives an empty last page", async () => {
	const t = harness();
	const ana = await startAna(t);
	await insertClosed(t, 3, positive);

	await expect(ana.query(api.progress.list, { before: "ayer" })).rejects.toThrow(
		"Revisa los datos e inténtalo otra vez.",
	);
	expect(await ana.query(api.progress.list, { before: "2000-01-01" })).toEqual({
		cycles: [],
		hidden: 0,
		next: null,
	});
});

// The streak reads at most 500 documents (cycles and activity checks).
test("a streak longer than the read budget is a lower bound, not an exact number", async () => {
	const t = harness();
	const ana = await startAna(t);
	await insertClosed(t, 600, positive);

	const result = await ana.query(api.progress.streak, {});
	expect(result.exact).toBe(false);
	expect(result.hasActive).toBe(true);
	expect(result.streak).toBeGreaterThan(0);
	expect(result.streak).toBeLessThan(600);
});

test("a cycle that went over inside the budget makes the streak exact even if the history is longer", async () => {
	const t = harness();
	const ana = await startAna(t);
	// The 10th newest cycle (week 590) is the one that went over.
	await insertClosed(t, 600, (i) => (i === 590 ? { needsCents: -1, wantsCents: 0 } : positive()));

	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 9,
		exact: true,
		hasActive: true,
	});
});

test("the activity checks count against the read budget", async () => {
	const t = harness();
	const ana = await startAna(t);
	// 300 idle cycles cost 300 documents + 300 checks: over 500, so the end is not reached.
	await insertClosed(t, 300, idle);

	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 0,
		exact: false,
		hasActive: false,
	});
});

test("200 idle cycles fit in the read budget and the empty history is known to be complete", async () => {
	const t = harness();
	const ana = await startAna(t);
	await insertClosed(t, 200, idle);

	expect(await ana.query(api.progress.streak, {})).toEqual({
		streak: 0,
		exact: true,
		hasActive: false,
	});
});

test("a split change mid-cycle counts as assigned money and spent never goes negative", async () => {
	const t = harness();
	const ana = await startAna(t);
	await spend(ana, "2026-10-22", "needs", 5_000);
	at("2026-10-23");
	// Free money 20_000 / 15_000 / 10_000 = 45_000 re-split 70/20/10 → 31_500 / 9_000 / 4_500.
	await ana.mutation(api.settings.updateSplit, {
		space: "personal",
		split: { needs: 70, wants: 20, savings: 10 },
	});
	await spend(ana, "2026-10-24", "wants", 2_000);
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles).toEqual([
		october({
			marginCents: 38_500,
			left: { needsCents: 31_500, wantsCents: 7_000 },
			detail: {
				kind: "ok",
				// needs: 25_000 + 11_500 moved in; wants: 15_000 − 6_000 moved out.
				assigned: { needsCents: 36_500, wantsCents: 9_000 },
				spent: { needsCents: 5_000, wantsCents: 2_000 },
				fundedCents: 4_500,
			},
		}),
	]);
});

test("paying a commitment counts as spent in its envelope", async () => {
	const t = harness();
	const ana = await startAna(t);
	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Luz",
		amountCents: 5_000,
		envelope: "needs",
		schedule: { frequency: "monthly", rule: { kind: "day", day: 25 } },
	});
	at("2026-10-25");
	const id = await t.run(async (ctx) => (await ctx.db.query("commitments").take(1))[0]._id);
	await ana.mutation(api.commitments.markPaid, { space: "personal", id });
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles[0]).toMatchObject({
		left: { needsCents: 20_000, wantsCents: 15_000 },
		detail: {
			kind: "ok",
			assigned: { needsCents: 25_000, wantsCents: 15_000 },
			spent: { needsCents: 5_000, wantsCents: 0 },
		},
	});
});

test("a withdrawal from the fund counts as assigned to Necesidades", async () => {
	const t = harness();
	const ana = await startAna(t);
	at("2026-10-25");
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 3_000 });
	await ana.mutation(api.transactions.withdrawSaving, {
		space: "personal",
		amountCents: 2_000,
		reason: "emergency",
	});
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles[0]).toMatchObject({
		left: { needsCents: 27_000, wantsCents: 15_000 },
		detail: {
			kind: "ok",
			assigned: { needsCents: 27_000, wantsCents: 15_000 },
			spent: { needsCents: 0, wantsCents: 0 },
			fundedCents: 7_000,
		},
	});
});

test("an early salary belongs to the next cycle's assigned, not to the one that closes", async () => {
	const t = harness();
	const ana = await startAna(t);
	at("2026-10-30");
	await ana.mutation(api.transactions.addIncome, {
		space: "personal",
		amountCents: 100_000,
		forNextCycle: true,
	});
	await closeOn(ana, "2026-12-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles.map((cycle) => cycle.detail)).toEqual([
		{
			kind: "ok",
			// November: carry 25_000 / 15_000 plus the early salary (50_000 / 30_000 / 20_000).
			assigned: { needsCents: 75_000, wantsCents: 45_000 },
			spent: { needsCents: 0, wantsCents: 0 },
			fundedCents: 20_000,
		},
		{
			kind: "ok",
			assigned: { needsCents: 25_000, wantsCents: 15_000 },
			spent: { needsCents: 0, wantsCents: 0 },
			fundedCents: 10_000,
		},
	]);
});

test("what passed to the fund is the real transfer: a saving movement at the end of the cycle and the fund balance", async () => {
	const t = harness();
	const ana = await startAna(t);
	at("2026-10-25");
	await ana.mutation(api.transactions.addSaving, { space: "personal", amountCents: 3_000 });
	await closeOn(ana, "2026-11-01");

	const { cycles } = await ana.query(api.progress.list, {});
	expect(cycles[0]).toMatchObject({ detail: { kind: "ok", fundedCents: 7_000 } });
	const fund = await ana.query(api.goals.fund, { space: "personal", today: "2026-11-01" });
	expect(fund.fundCents).toBe(10_000);
	const { cycle } = await firstCycle(t);
	const closing = await t.run(async (ctx) => {
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_cycleId", (q) => q.eq("cycleId", cycle._id))
			.take(10);
		return rows.filter((row) => row.kind === "saving" && row.date === "2026-10-31");
	});
	expect(closing).toMatchObject([{ amountCents: 7_000 }]);
});

test("closing a cycle again does not recompute its summary", async () => {
	const t = harness();
	const ana = await startAna(t);
	await closeOn(ana, "2026-11-01");
	const before = await ana.query(api.progress.list, {});
	const { space, cycle } = await firstCycle(t);
	await t.run(async (ctx) => {
		await ctx.db.insert("transactions", {
			kind: "expense",
			spaceId: space._id,
			cycleId: cycle._id,
			userId: "someone",
			amountCents: 100,
			date: "2026-10-21",
			envelope: "needs",
		});
		const closed = await ctx.db.get("cycles", cycle._id);
		if (!closed) throw new Error("sin ciclo");
		await closeCycle(ctx, space, closed, "someone");
	});

	expect(await ana.query(api.progress.list, {})).toEqual(before);
});

test("without a session nobody can read the progress", async () => {
	const t = harness();
	await startAna(t);

	await expect(t.query(api.progress.list, {})).rejects.toThrow();
	await expect(t.query(api.progress.streak, {})).rejects.toThrow();
});

test("each person sees only their own cycles, and a closed household cycle is not in the personal history", async () => {
	const t = harness();
	const ana = await startAna(t);
	await ana.mutation(api.profiles.startTrial, {});
	await ana.mutation(api.household.createHousehold, { name: "Casa" });
	await closeOn(ana, "2026-11-01");
	await ana.mutation(api.cycles.ensureOpen, { space: "household" });
	const closedHouseholdCycles = await t.run(async (ctx) => {
		const spaces = await ctx.db.query("spaces").take(5);
		const household = spaces.find((space) => space.kind === "household");
		if (!household) throw new Error("sin hogar");
		const cycles = await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", household._id))
			.take(5);
		return cycles.filter((cycle) => cycle.closedAt !== undefined).length;
	});
	expect(closedHouseholdCycles).toBe(1);
	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Luis" });

	const anas = await ana.query(api.progress.list, {});
	expect(anas.cycles.map((cycle) => cycle.startDate)).toEqual(["2026-10-20"]);
	expect(await luis.query(api.progress.list, {})).toEqual({ cycles: [], hidden: 0, next: null });
	expect(await luis.query(api.progress.streak, {})).toMatchObject({ streak: 0, hasActive: false });
});
