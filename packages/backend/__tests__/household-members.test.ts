import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import {
	couple,
	DAY,
	type Harness,
	householdSpaceId,
	joinedCouple,
	monthly15,
	setTrialEnd,
	signUp,
	startUser,
} from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const household = "household" as const;
const TODAY = "2026-10-20";
const ALONE = "Tu pareja aún no entra.";
const NOT_EMPTY = "Tu hogar ya tiene movimientos. No lo podemos borrar desde aquí.";
const ALREADY_IN = "Ya formas parte de un hogar.";

async function householdCount(t: Harness) {
	return await t.run(async (ctx) => {
		const spaces = await ctx.db.query("spaces").take(20);
		return spaces.filter((space) => space.kind === "household").length;
	});
}

test("who created the household can leave when the other is in; the other can invite from then on", async () => {
	const { ana, luis } = await joinedCouple();
	await expect(luis.as.mutation(api.household.createInvite, {})).rejects.toThrow();
	expect((await luis.as.query(api.household.get, {}))?.isOwner).toBe(false);

	await ana.as.mutation(api.household.leaveHousehold, {});
	expect(await ana.as.query(api.household.get, {})).toBeNull();
	expect((await luis.as.query(api.household.get, {}))?.isOwner).toBe(true);
	const { code } = await luis.as.mutation(api.household.createInvite, {});
	expect(code).toMatch(/^[A-Z2-9]{6}$/);
});

test("the one who joined can leave too and the creator keeps the household", async () => {
	const { ana, luis } = await joinedCouple();
	await luis.as.mutation(api.household.leaveHousehold, {});
	expect(await luis.as.query(api.household.get, {})).toBeNull();
	const mine = await ana.as.query(api.household.get, {});
	expect(mine).toMatchObject({ isOwner: true, partnerName: null, partnerLeft: "Renzo" });
	expect(mine?.invite).toBeNull();
});

test("alone, nobody can leave and the household stays", async () => {
	const { ana } = await couple();
	await expect(ana.as.mutation(api.household.leaveHousehold, {})).rejects.toThrow(ALONE);
	expect(await ana.as.query(api.household.get, {})).not.toBeNull();
});

test("when both try to leave, the second one is refused and the household is not left empty", async () => {
	const { t, ana, luis } = await joinedCouple();
	await ana.as.mutation(api.household.leaveHousehold, {});
	await expect(luis.as.mutation(api.household.leaveHousehold, {})).rejects.toThrow(ALONE);
	expect(await luis.as.query(api.household.get, {})).not.toBeNull();
	expect(await householdCount(t)).toBe(1);
});

test("who is not in a household cannot leave", async () => {
	const { luis } = await couple();
	await expect(luis.as.mutation(api.household.leaveHousehold, {})).rejects.toThrow(
		"Aún no tienes un hogar.",
	);
});

test("leaving keeps the history, the fund and the Personal space as they were", async () => {
	const { ana, luis } = await joinedCouple();
	await ana.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100_000 });
	await luis.as.mutation(api.transactions.addExpense, {
		space: household,
		amountCents: 4_000,
		envelope: "needs",
		note: "Mercado",
	});
	await luis.as.mutation(api.transactions.addSaving, { space: household, amountCents: 5_000 });
	const personalBefore = await luis.as.query(api.balances.getHome, {
		space: "personal",
		today: TODAY,
	});

	await luis.as.mutation(api.household.leaveHousehold, {});

	const { rows } = await ana.as.query(api.transactions.list, { space: household, today: TODAY });
	expect(rows.find((row) => row.note === "Mercado")).toMatchObject({ who: "Renzo", mine: false });
	expect((await ana.as.query(api.goals.fund, { space: household, today: TODAY })).fundCents).toBe(
		5_000,
	);
	expect(await luis.as.query(api.balances.getHome, { space: "personal", today: TODAY })).toEqual(
		personalBefore,
	);
});

test("the one who stays sees who left until they dismiss it; a new partner clears it and sees the history", async () => {
	const { t, ana, luis } = await joinedCouple();
	await luis.as.mutation(api.transactions.addExpense, {
		space: household,
		amountCents: 1_000,
		envelope: "needs",
		note: "Pan",
	});
	await luis.as.mutation(api.household.leaveHousehold, {});
	expect((await ana.as.query(api.household.get, {}))?.partnerLeft).toBe("Renzo");

	await ana.as.mutation(api.household.dismissPartnerLeft, {});
	expect((await ana.as.query(api.household.get, {}))?.partnerLeft).toBeNull();

	const marta = await startUser(t, "marta@correo.com", "Marta Soto");
	const { code } = await ana.as.mutation(api.household.createInvite, {});
	expect(await marta.as.mutation(api.household.joinHousehold, { code })).toEqual({ ok: true });
	expect((await ana.as.query(api.household.get, {}))?.partnerLeft).toBeNull();
	const { rows } = await marta.as.query(api.transactions.list, { space: household, today: TODAY });
	expect(rows.find((row) => row.note === "Pan")?.who).toBe("Renzo");
});

test("a new partner clears a notice nobody dismissed", async () => {
	const { t, ana, luis } = await joinedCouple();
	await luis.as.mutation(api.household.leaveHousehold, {});
	expect((await ana.as.query(api.household.get, {}))?.partnerLeft).toBe("Renzo");
	const marta = await startUser(t, "marta@correo.com", "Marta Soto");
	const { code } = await ana.as.mutation(api.household.createInvite, {});
	await marta.as.mutation(api.household.joinHousehold, { code });
	expect((await ana.as.query(api.household.get, {}))?.partnerLeft).toBeNull();
});

test("if who paid leaves, the one who stays is read-only until they have Plus", async () => {
	const { t, ana, luis } = await joinedCouple();
	await setTrialEnd(t, ana.userId, Date.now() + 60 * DAY);
	await setTrialEnd(t, luis.userId, Date.now() - DAY);
	const args = { space: household, amountCents: 100, envelope: "needs" as const };
	await luis.as.mutation(api.transactions.addExpense, args);

	await ana.as.mutation(api.household.leaveHousehold, {});
	expect((await luis.as.query(api.household.get, {}))?.plus.active).toBe(false);
	await expect(luis.as.mutation(api.transactions.addExpense, args)).rejects.toThrow(
		"Solo lectura. Activa Plus para seguir anotando.",
	);
	await setTrialEnd(t, luis.userId, Date.now() + 14 * DAY);
	await luis.as.mutation(api.transactions.addExpense, args);
});

test("who left can create or join another household", async () => {
	const { ana, luis } = await joinedCouple();
	await luis.as.mutation(api.household.leaveHousehold, {});
	await luis.as.mutation(api.household.createHousehold, { name: "Mía" });
	expect((await luis.as.query(api.household.get, {}))?.name).toBe("Mía");
	expect((await ana.as.query(api.household.get, {}))?.name).toBeNull();
});

test("the partner's join date is saved", async () => {
	const { ana, luis } = await couple();
	vi.setSystemTime(new Date("2026-10-22T17:00:00.000Z"));
	const { code } = await ana.as.mutation(api.household.createInvite, {});
	await luis.as.mutation(api.household.joinHousehold, { code });
	expect((await ana.as.query(api.household.get, {}))?.partnerJoinedAt).toBe(Date.now());
	expect((await luis.as.query(api.household.get, {}))?.partnerJoinedAt).not.toBeNull();
});

/** Camila's invite is out; Renzo made his own household and invited nobody. */
async function renzoWithHisOwn() {
	const { t, ana, luis, code } = await couple();
	await luis.as.mutation(api.household.createHousehold, { name: "Mío" });
	return { t, ana, luis, code };
}

test("'Borrar el mío y unirme': an empty household is deleted and its owner joins the other", async () => {
	const { t, ana, luis, code } = await renzoWithHisOwn();
	expect(await householdCount(t)).toBe(2);
	expect(await luis.as.query(api.household.isEmpty, {})).toBe(true);

	await expect(luis.as.mutation(api.household.joinHousehold, { code })).rejects.toThrow(ALREADY_IN);
	expect(await householdCount(t)).toBe(2);

	expect(await luis.as.mutation(api.household.joinHousehold, { code, replaceEmpty: true })).toEqual(
		{ ok: true },
	);
	expect(await householdCount(t)).toBe(1);
	const left = await t.run(async (ctx) => ({
		spaces: await ctx.db.query("spaces").take(20),
		cycles: await ctx.db.query("cycles").take(50),
		members: await ctx.db.query("spaceMembers").take(10),
	}));
	const spaceId = await householdSpaceId(t);
	expect(left.members.filter((member) => member.spaceId === spaceId)).toHaveLength(2);
	const spaceIds = new Set(left.spaces.map((space) => space._id));
	expect(left.cycles.every((cycle) => spaceIds.has(cycle.spaceId))).toBe(true);
	expect(left.members.every((member) => spaceIds.has(member.spaceId))).toBe(true);
	expect((await ana.as.query(api.household.get, {}))?.partnerName).toBe("Renzo");
});

test("a household with anything recorded is not deleted and nothing is lost", async () => {
	const setups: [string, (s: Awaited<ReturnType<typeof renzoWithHisOwn>>) => Promise<unknown>][] = [
		[
			"an expense",
			(s) =>
				s.luis.as.mutation(api.transactions.addExpense, {
					space: household,
					amountCents: 100,
					envelope: "needs",
				}),
		],
		[
			"an income",
			(s) => s.luis.as.mutation(api.transactions.addIncome, { space: household, amountCents: 100 }),
		],
		[
			"a commitment",
			(s) =>
				s.luis.as.mutation(api.commitments.add, {
					space: household,
					name: "Luz",
					amountCents: 100,
					envelope: "needs",
					schedule: { frequency: "monthly", rule: { kind: "day", day: 25 } },
				}),
		],
		[
			"a goal",
			(s) =>
				s.luis.as.mutation(api.goals.add, { space: household, name: "Viaje", targetCents: 1_000 }),
		],
	];
	for (const [name, record] of setups) {
		const s = await renzoWithHisOwn();
		await record(s);
		expect(await s.luis.as.query(api.household.isEmpty, {}), name).toBe(false);
		await expect(
			s.luis.as.mutation(api.household.joinHousehold, { code: s.code, replaceEmpty: true }),
			name,
		).rejects.toThrow(NOT_EMPTY);
		expect(await householdCount(s.t), name).toBe(2);
		expect((await s.luis.as.query(api.household.get, {}))?.name, name).toBe("Mío");
	}
});

test("a bad or used code never deletes anything", async () => {
	const { t, luis, code } = await renzoWithHisOwn();
	expect(
		await luis.as.mutation(api.household.joinHousehold, { code: "ZZZZZZ", replaceEmpty: true }),
	).toEqual({ ok: false, reason: "invalid" });
	expect(await householdCount(t)).toBe(2);

	vi.setSystemTime(new Date(Date.parse("2026-10-20T17:00:00.000Z") + 8 * DAY));
	expect(await luis.as.mutation(api.household.joinHousehold, { code, replaceEmpty: true })).toEqual(
		{
			ok: false,
			reason: "expired",
		},
	);
	expect(await householdCount(t)).toBe(2);
	expect((await luis.as.query(api.household.get, {}))?.name).toBe("Mío");
});

test("your own code is not a way to delete your household", async () => {
	const { t, luis } = await renzoWithHisOwn();
	const { code } = await luis.as.mutation(api.household.createInvite, {});
	await expect(
		luis.as.mutation(api.household.joinHousehold, { code, replaceEmpty: true }),
	).rejects.toThrow(ALREADY_IN);
	expect(await householdCount(t)).toBe(2);
});

test("with a partner already in, the household is not deleted", async () => {
	const { t, ana, luis, code } = await renzoWithHisOwn();
	const marta = await startUser(t, "marta@correo.com", "Marta Soto");
	const { code: renzosCode } = await luis.as.mutation(api.household.createInvite, {});
	await marta.as.mutation(api.household.joinHousehold, { code: renzosCode });
	await expect(
		luis.as.mutation(api.household.joinHousehold, { code, replaceEmpty: true }),
	).rejects.toThrow();
	expect(await householdCount(t)).toBe(2);
	expect((await ana.as.query(api.household.get, {}))?.partnerName).toBeNull();
});

test("race: the partner joins his household first, so he cannot delete it; the other way round, her code dies", async () => {
	const first = await renzoWithHisOwn();
	const martaA = await startUser(first.t, "marta@correo.com", "Marta Soto");
	const { code: renzosCode } = await first.luis.as.mutation(api.household.createInvite, {});
	await martaA.as.mutation(api.household.joinHousehold, { code: renzosCode });
	await expect(
		first.luis.as.mutation(api.household.joinHousehold, { code: first.code, replaceEmpty: true }),
	).rejects.toThrow();
	expect((await martaA.as.query(api.household.get, {}))?.partnerName).toBe("Renzo");

	const second = await renzoWithHisOwn();
	const martaB = await startUser(second.t, "marta@correo.com", "Marta Soto");
	const { code: oldCode } = await second.luis.as.mutation(api.household.createInvite, {});
	await second.luis.as.mutation(api.household.joinHousehold, {
		code: second.code,
		replaceEmpty: true,
	});
	expect(await martaB.as.mutation(api.household.joinHousehold, { code: oldCode })).toEqual({
		ok: false,
		reason: "invalid",
	});
});

test("someone with no Personal plan joins, reads and writes the household, and arms Personal later", async () => {
	const { t, ana, code } = await couple();
	vi.setSystemTime(new Date("2026-10-20T18:00:00.000Z"));
	const marta = await signUp(t, "marta@correo.com", "Marta Soto");
	expect(await marta.as.mutation(api.household.joinHousehold, { code })).toEqual({ ok: true });

	expect(await marta.as.query(api.profiles.myProfile, {})).toMatchObject({
		plan: null,
		hasHousehold: true,
		hasPlus: false,
	});
	await marta.as.mutation(api.cycles.ensureOpen, { space: household });
	await marta.as.mutation(api.transactions.addIncome, { space: household, amountCents: 20_000 });
	expect((await ana.as.query(api.household.contributions, { today: TODAY })).partnerCents).toBe(
		20_000,
	);
	await expect(marta.as.mutation(api.cycles.ensureOpen, { space: "personal" })).rejects.toThrow(
		"Termina tus primeros pasos.",
	);
	await expect(
		marta.as.query(api.balances.getHome, { space: "personal", today: TODAY }),
	).rejects.toThrow("Termina tus primeros pasos.");

	await marta.as.mutation(api.profiles.completeOnboarding, { ...monthly15, name: "Marta" });
	const own = await marta.as.query(api.balances.getHome, { space: "personal", today: TODAY });
	expect(own.needsCents).toBe(30_000);
	const shared = await marta.as.query(api.balances.getHome, { space: household, today: TODAY });
	expect(shared.needsCents).toBe(10_000);
});
