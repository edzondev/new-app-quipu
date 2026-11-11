import { afterEach, expect, test, vi } from "vitest";
import { api, components, internal } from "../convex/_generated/api";
import { getLimaDate } from "../shared/dates";
import { runsAtFor } from "../shared/deletion";
import {
	captureOtp,
	couple,
	DAY,
	type Harness,
	harness,
	joinedCouple,
	post,
	setTrialEnd,
	startUser,
	START,
	subscribe,
} from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const WRONG = "Código incorrecto.";
const WAIT = "Espera un momento antes de intentarlo otra vez.";
const EMAIL = "camila@correo.com";
// Lima midnight of the 20th of October plus 15 days.
const RUNS_AT = Date.parse("2026-11-04T05:00:00Z");

type Person = Awaited<ReturnType<typeof startUser>>;

async function ask(person: Person, email = EMAIL) {
	// The code limit is 1 per 90 s per email, shared with sign-in.
	vi.advanceTimersByTime(91_000);
	const code = await captureOtp(email, () =>
		person.as.mutation(api.accountDeletion.requestCode, {}),
	);
	if (!code) throw new Error("the code was not sent");
	return code;
}

async function confirmDeletion(person: Person, email = EMAIL) {
	expect(
		await person.as.mutation(api.accountDeletion.confirm, { code: await ask(person, email) }),
	).toEqual({ ok: true });
}

/** Signing in again after the request: every session was closed, and signing in does not undo it. */
async function signBackIn(t: Harness, person: Person, email = EMAIL) {
	vi.advanceTimersByTime(91_000);
	const code = await captureOtp(email, async () => {
		const sent = await post(t, "/email-otp/send-verification-otp", { email, type: "sign-in" });
		expect(sent.ok).toBe(true);
	});
	expect((await post(t, "/sign-in/email-otp", { email, otp: code })).status).toBe(200);
	const where = [{ field: "userId" as const, value: person.userId }];
	await t.mutation(components.betterAuth.adapter.updateOne, {
		input: { model: "session", where, update: { expiresAt: Date.UTC(2027, 0, 1) } },
	});
	const session = await t.query(components.betterAuth.adapter.findOne, { model: "session", where });
	return t.withIdentity({ subject: person.userId, sessionId: session._id });
}

async function alone() {
	const t = harness();
	const ana = await startUser(t, EMAIL, "Camila Rojas");
	return { t, ana };
}

/** Lets every scheduled function run, jumping the clock to each one. */
async function runScheduled(t: Harness) {
	await t.finishAllScheduledFunctions(vi.runAllTimers);
}

type FindMany = (typeof components.betterAuth.adapter.findMany)["_args"];

function authRows(t: Harness, model: string, field: string, value: string) {
	const args = { model, where: [{ field, value }], paginationOpts: { numItems: 10, cursor: null } };
	return t
		.query(components.betterAuth.adapter.findMany, args as FindMany)
		.then((result) => result.page);
}

function getProfile(t: Harness, userId: string) {
	return t.run((ctx) =>
		ctx.db
			.query("profiles")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique(),
	);
}

/** Nothing was deleted: the person, their space, its cycle and its movement are all there. */
async function expectIntact(t: Harness, userId: string) {
	expect(await getProfile(t, userId)).not.toBeNull();
	expect(await authRows(t, "user", "_id", userId)).toHaveLength(1);
	const rows = await t.run(async (ctx) => ({
		spaces: (await ctx.db.query("spaces").take(5)).length,
		cycles: (await ctx.db.query("cycles").take(5)).length,
		transactions: (await ctx.db.query("transactions").take(5)).length,
	}));
	expect(rows).toEqual({ spaces: 1, cycles: 1, transactions: 1 });
}

function getHouseholdSpace(t: Harness) {
	return t.run(async (ctx) =>
		(await ctx.db.query("spaces").take(10)).find((space) => space.kind === "household"),
	);
}

function scheduledPurges(t: Harness) {
	return t.run(async (ctx) =>
		(await ctx.db.system.query("_scheduled_functions").take(20)).filter((job) =>
			job.name.includes("accountDeletion:purge"),
		),
	);
}

test("runsAtFor is Lima midnight of today plus 15 days, even at 23:30 in Lima", () => {
	// 23:30 on the 20th in Lima is already the 21st in UTC.
	expect(runsAtFor(getLimaDate(new Date("2026-10-21T04:30:00Z")))).toBe(RUNS_AT);
	expect(runsAtFor("2026-10-20")).toBe(RUNS_AT);
});

test("requestCode sends a code to the account's email, and a second one within 90 s is refused", async () => {
	const { ana } = await alone();
	expect(await ask(ana)).toMatch(/^\d{6}$/);
	await expect(ana.as.mutation(api.accountDeletion.requestCode, {})).rejects.toThrow(WAIT);
});

test("the deletion code does not sign anyone in", async () => {
	const { t, ana } = await alone();
	const code = await ask(ana);
	const res = await post(t, "/sign-in/email-otp", { email: EMAIL, otp: code });
	expect(res.ok).toBe(false);
	expect(await authRows(t, "session", "userId", ana.userId)).toHaveLength(1);
});

test("requestCode is refused while the deletion is pending", async () => {
	const { t, ana } = await alone();
	await confirmDeletion(ana);
	const back = await signBackIn(t, ana);
	vi.advanceTimersByTime(91_000);
	await expect(back.mutation(api.accountDeletion.requestCode, {})).rejects.toThrow(
		"Tu cuenta ya se está eliminando.",
	);
});

test("a good code stores the date, closes every session and schedules the purge for that date", async () => {
	const { t, ana } = await alone();
	await t.mutation(components.betterAuth.adapter.create, {
		input: {
			model: "session",
			data: {
				token: "second-device",
				userId: ana.userId,
				expiresAt: Date.UTC(2027, 0, 1),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		},
	});
	expect(await authRows(t, "session", "userId", ana.userId)).toHaveLength(2);

	await confirmDeletion(ana);
	expect(await authRows(t, "session", "userId", ana.userId)).toHaveLength(0);
	expect(await ana.as.query(api.profiles.myProfile, {})).toBeNull();
	const back = await signBackIn(t, ana);
	expect((await back.query(api.profiles.myProfile, {}))?.deletionRunsAt).toBe(RUNS_AT);
	expect((await scheduledPurges(t)).map((job) => job.scheduledTime)).toEqual([RUNS_AT]);
});

test("a wrong code says so and stores and schedules nothing", async () => {
	const { t, ana } = await alone();
	await ask(ana);
	expect(await ana.as.mutation(api.accountDeletion.confirm, { code: "000000" })).toEqual({
		ok: false,
		error: WRONG,
	});
	expect((await ana.as.query(api.profiles.myProfile, {}))?.deletionRunsAt).toBeNull();
	expect(await authRows(t, "session", "userId", ana.userId)).toHaveLength(1);
	expect(await scheduledPurges(t)).toHaveLength(0);
});

test("after three wrong codes the right one is refused too", async () => {
	const { ana } = await alone();
	const code = await ask(ana);
	for (let i = 0; i < 3; i++) {
		expect(await ana.as.mutation(api.accountDeletion.confirm, { code: "000000" })).toEqual({
			ok: false,
			error: WRONG,
		});
	}
	expect(await ana.as.mutation(api.accountDeletion.confirm, { code })).toEqual({
		ok: false,
		error: WRONG,
	});
});

test("cancel clears the request before the date, and is refused at the date or with nothing pending", async () => {
	const { t, ana } = await alone();
	await expect(ana.as.mutation(api.accountDeletion.cancel, {})).rejects.toThrow(
		"Tu cuenta no se está eliminando.",
	);
	await confirmDeletion(ana);
	const back = await signBackIn(t, ana);
	await back.mutation(api.accountDeletion.cancel, {});
	expect((await back.query(api.profiles.myProfile, {}))?.deletionRunsAt).toBeNull();

	await confirmDeletion({ as: back, userId: ana.userId });
	const again = await signBackIn(t, ana);
	vi.setSystemTime((await again.query(api.profiles.myProfile, {}))?.deletionRunsAt ?? 0);
	await expect(again.mutation(api.accountDeletion.cancel, {})).rejects.toThrow(
		"Tu cuenta no se está eliminando.",
	);
});

test("purge before the date deletes nothing", async () => {
	const { t, ana } = await alone();
	await confirmDeletion(ana);
	await t.mutation(internal.accountDeletion.purge, { userId: ana.userId });
	await expectIntact(t, ana.userId);
});

test("the purge scheduled before a cancel deletes nothing", async () => {
	const { t, ana } = await alone();
	await confirmDeletion(ana);
	await (await signBackIn(t, ana)).mutation(api.accountDeletion.cancel, {});
	await runScheduled(t);
	await expectIntact(t, ana.userId);
});

test("cancelling and asking again: the old purge deletes nothing, the new date holds", async () => {
	const { t, ana } = await alone();
	await confirmDeletion(ana);
	vi.advanceTimersByTime(DAY);
	const back = await signBackIn(t, ana);
	await back.mutation(api.accountDeletion.cancel, {});
	await confirmDeletion({ as: back, userId: ana.userId });
	const again = await signBackIn(t, ana);
	expect((await again.query(api.profiles.myProfile, {}))?.deletionRunsAt).toBe(RUNS_AT + DAY);

	// The next timer is the old purge, at the old date.
	await vi.advanceTimersToNextTimerAsync();
	await t.finishInProgressScheduledFunctions();
	expect(Date.now()).toBe(RUNS_AT);
	expect(await getProfile(t, ana.userId)).toMatchObject({ deletionRunsAt: RUNS_AT + DAY });
	await expectIntact(t, ana.userId);
});

test("when due it deletes the person's data, their sign-in rows and their profile, and nobody else's", async () => {
	const { t, ana } = await alone();
	const renzo = await startUser(t, "renzo@correo.com", "Renzo Paz");
	await t.mutation(components.betterAuth.adapter.create, {
		input: {
			model: "passkey",
			data: {
				userId: ana.userId,
				publicKey: "key",
				credentialID: "credential",
				counter: 0,
				deviceType: "singleDevice",
				backedUp: false,
			},
		},
	});
	await confirmDeletion(ana);
	await runScheduled(t);

	expect(await getProfile(t, ana.userId)).toBeNull();
	expect(await authRows(t, "user", "_id", ana.userId)).toHaveLength(0);
	expect(await authRows(t, "passkey", "userId", ana.userId)).toHaveLength(0);
	expect(await authRows(t, "session", "userId", ana.userId)).toHaveLength(0);
	expect(await authRows(t, "account", "userId", ana.userId)).toHaveLength(0);
	expect(
		await authRows(t, "verification", "identifier", `email-verification-otp-${EMAIL}`),
	).toHaveLength(0);
	const left = await t.run(async (ctx) => ({
		spaces: (await ctx.db.query("spaces").take(10)).map((space) => space.ownerId),
		cycles: (await ctx.db.query("cycles").take(10)).length,
		transactions: (await ctx.db.query("transactions").take(10)).map((row) => row.userId),
	}));
	expect(left).toEqual({ spaces: [renzo.userId], cycles: 1, transactions: [renzo.userId] });
	expect(await authRows(t, "user", "_id", renzo.userId)).toHaveLength(1);
});

test("more than 500 rows take several chained runs and all go", async () => {
	const { t, ana } = await alone();
	await t.run(async (ctx) => {
		const cycle = await ctx.db.query("cycles").first();
		if (!cycle) throw new Error("missing cycle");
		for (let i = 0; i < 1_100; i++) {
			await ctx.db.insert("transactions", {
				kind: "expense",
				envelope: "wants",
				spaceId: cycle.spaceId,
				cycleId: cycle._id,
				userId: ana.userId,
				amountCents: 100,
				date: "2026-10-20",
			});
		}
	});
	await confirmDeletion(ana);
	vi.setSystemTime(RUNS_AT);
	await t.mutation(internal.accountDeletion.purge, { userId: ana.userId });
	const afterOneRun = await t.run(
		async (ctx) => (await ctx.db.query("transactions").take(2_000)).length,
	);
	expect(afterOneRun).toBeGreaterThan(0);

	await runScheduled(t);
	expect(await t.run((ctx) => ctx.db.query("transactions").first())).toBeNull();
	expect(await getProfile(t, ana.userId)).toBeNull();
});

test("while the deletion is pending the person is still in the household", async () => {
	const { t, ana, luis } = await joinedCouple();
	await confirmDeletion(ana);
	expect((await luis.as.query(api.household.get, {}))?.partnerName).toBe("Camila");
	const back = await signBackIn(t, ana);
	expect((await back.query(api.household.get, {}))?.partnerName).toBe("Renzo");
});

test("the owner deletes: the partner stays as owner with the fund, the history and their Personal", async () => {
	const { t, ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: "household", amountCents: 100_000 });
	await ana.as.mutation(api.transactions.addExpense, {
		space: "household",
		amountCents: 1_000,
		envelope: "needs",
	});
	await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(10)).find((row) => row.kind === "household");
		if (space) await ctx.db.patch("spaces", space._id, { fundCents: 25_000 });
	});

	await confirmDeletion(ana);
	await runScheduled(t);

	expect(await luis.as.query(api.household.get, {})).toMatchObject({
		isOwner: true,
		partnerName: null,
		partnerLeft: "Camila",
	});
	expect((await getHouseholdSpace(t))?.fundCents).toBe(25_000);
	const { rows } = await luis.as.query(api.transactions.list, {
		space: "household",
		today: "2026-10-20",
	});
	expect(rows.map((row) => row.amountCents).sort()).toEqual([1_000, 100_000]);
	expect(
		(await luis.as.query(api.balances.getHome, { space: "personal", today: "2026-10-20" }))
			.needsCents,
	).toBe(30_000);
});

test("the invited one deletes: the owner keeps the household and is told who left", async () => {
	const { t, ana, luis } = await joinedCouple();
	await confirmDeletion(luis, "renzo@correo.com");
	await runScheduled(t);
	expect(await ana.as.query(api.household.get, {})).toMatchObject({
		isOwner: true,
		partnerName: null,
		partnerLeft: "Renzo",
	});
});

test("alone in the household, it goes with them, events included", async () => {
	const { t, ana } = await couple();
	await ana.as.mutation(api.household.rename, { name: "Casa" });
	expect(await t.run((ctx) => ctx.db.query("spaceEvents").first())).not.toBeNull();

	await confirmDeletion(ana, "camila@correo.com");
	await runScheduled(t);
	expect(await getHouseholdSpace(t)).toBeNull();
	expect(await t.run((ctx) => ctx.db.query("spaceEvents").first())).toBeNull();
	expect(await t.run((ctx) => ctx.db.query("spaceMembers").first())).toBeNull();
});

test("when the one who pays Plus deletes, a partner without Plus of their own loses it", async () => {
	const { t, ana, luis } = await joinedCouple();
	await subscribe(t, ana.userId);
	await setTrialEnd(t, luis.userId, Date.parse(START) - DAY);
	expect((await luis.as.query(api.household.get, {}))?.plus.active).toBe(true);

	await confirmDeletion(ana, "camila@correo.com");
	await runScheduled(t);
	expect((await luis.as.query(api.household.get, {}))?.plus.active).toBe(false);
});

test("myProfile says when the account will be deleted, or null", async () => {
	const { t, ana } = await alone();
	expect((await ana.as.query(api.profiles.myProfile, {}))?.deletionRunsAt).toBeNull();
	await confirmDeletion(ana);
	const back = await signBackIn(t, ana);
	expect((await back.query(api.profiles.myProfile, {}))?.deletionRunsAt).toBe(RUNS_AT);
});
