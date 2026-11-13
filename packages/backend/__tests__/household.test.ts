import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import { type Harness, harness, signIn } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	todayCents: 50_000,
	incomeCents: 150_000,
	split: { needs: 50, wants: 30, savings: 20 },
};

test("Ana invites Luis; Luis spends; Ana cannot delete Luis's expense", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });

	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Ana" });
	await ana.mutation(api.profiles.startTrial, {});
	await ana.mutation(api.household.createHousehold, { name: "Casa" });
	const { code } = await ana.mutation(api.household.createInvite, {});

	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Luis" });
	expect(await luis.mutation(api.household.joinHousehold, { code })).toEqual({ ok: true });

	await luis.mutation(api.transactions.addExpense, {
		space: "household",
		amountCents: 5_000,
		envelope: "needs",
	});
	const expenseId = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(5)).find((row) => row.kind === "household");
		if (!space) throw new Error("missing household");
		const rows = await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", space._id).eq("kind", "expense"))
			.take(5);
		return rows[0]._id;
	});

	await expect(
		ana.mutation(api.transactions.deleteExpense, { space: "household", id: expenseId }),
	).rejects.toThrow("Solo quien lo registró puede cambiarlo.");
});

test("six bad invite codes in a row: the sixth is rate_limited", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const luis = await signIn(t, "luis@correo.com", "Luis");
	await luis.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Luis" });

	const results = [];
	for (let i = 0; i < 6; i++) {
		results.push(await luis.mutation(api.household.joinHousehold, { code: "ZZZZZZ" }));
	}
	expect(results.slice(0, 5)).toEqual([
		{ ok: false, reason: "invalid" },
		{ ok: false, reason: "invalid" },
		{ ok: false, reason: "invalid" },
		{ ok: false, reason: "invalid" },
		{ ok: false, reason: "invalid" },
	]);
	expect(results[5]).toEqual({ ok: false, reason: "rate_limited" });
});

const DAY = 24 * 60 * 60 * 1000;
const START = "2026-10-20T17:00:00.000Z";
const monthly15 = {
	...onboard,
	cycleStartDay: 15,
	split: { needs: 60, wants: 20, savings: 20 },
};

// Sign in under the fake clock, then stretch the 7-day session so tests can jump weeks ahead.
async function startUser(t: Harness, email: string, name: string) {
	vi.useFakeTimers({ now: new Date(START) });
	const user = await signIn(t, email, name);
	const row = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: email }],
	});
	await t.mutation(components.betterAuth.adapter.updateOne, {
		input: {
			model: "session",
			where: [{ field: "userId", value: row._id }],
			update: { expiresAt: Date.UTC(2027, 0, 1) },
		},
	});
	await user.mutation(api.profiles.completeOnboarding, { ...monthly15, name });
	await user.mutation(api.profiles.startTrial, {});
	return user;
}

/** Ana ("Camila Rojas") creates the household; Luis ("Renzo Paz") is signed in, not yet inside. */
async function couple() {
	const t = harness();
	const ana = await startUser(t, "camila@correo.com", "Camila Rojas");
	const luis = await startUser(t, "renzo@correo.com", "Renzo Paz");
	const { code } = await ana.mutation(api.household.createHousehold, {});
	return { t, ana, luis, code };
}

test("with Plus, creating the household returns a code that lasts 7 days", async () => {
	const { ana, code } = await couple();
	expect(code).toMatch(/^[A-Z2-9]{6}$/);
	const info = await ana.query(api.household.get, {});
	expect(info?.invite).toEqual({ code, expiresAt: Date.now() + 7 * DAY });
});

test("the household is born 50·30·20 and with the creator's cycle day", async () => {
	const { ana } = await couple();
	const home = await ana.query(api.balances.getHome, { space: "household", today: "2026-10-20" });
	const personal = await ana.query(api.balances.getHome, {
		space: "personal",
		today: "2026-10-20",
	});
	expect(personal.split).toEqual({ needs: 60, wants: 20, savings: 20 });
	expect(home.split).toEqual({ needs: 50, wants: 30, savings: 20 });
	expect(home.endDate).toBe("2026-11-14");
});

test("the household keeps its own cycle when the creator changes theirs", async () => {
	const { ana } = await couple();
	await ana.mutation(api.settings.updatePlan, {
		cadence: "biweekly",
		cycleStartDay: 1,
		incomeCents: 150_000,
	});
	vi.setSystemTime(new Date("2026-11-15T17:00:00.000Z"));
	// Her personal cycle rolls first, so her new plan is the current one when the household rolls.
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	await ana.mutation(api.cycles.ensureOpen, { space: "household" });
	const home = await ana.query(api.balances.getHome, { space: "household", today: "2026-11-15" });
	expect([home.startDate, home.endDate]).toEqual(["2026-11-15", "2026-12-14"]);
});

test("without Plus the household is not created", async () => {
	const t = harness();
	const ana = await startUser(t, "camila@correo.com", "Camila Rojas");
	expect((await ana.query(api.profiles.myProfile, {}))?.hasPlus).toBe(true);

	vi.setSystemTime(new Date(Date.parse(START) + 15 * DAY));
	expect((await ana.query(api.profiles.myProfile, {}))?.hasPlus).toBe(false);
	await expect(ana.mutation(api.household.createHousehold, {})).rejects.toThrow(
		"Esto requiere Quipu Plus.",
	);
	expect(await ana.query(api.household.get, {})).toBeNull();
});

test("a double tap on create makes one household", async () => {
	const t = harness();
	const ana = await startUser(t, "camila@correo.com", "Camila Rojas");
	const results = await Promise.allSettled([
		ana.mutation(api.household.createHousehold, {}),
		ana.mutation(api.household.createHousehold, {}),
	]);
	expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
	expect(await ana.query(api.household.get, {})).not.toBeNull();
});

test("someone already in a household cannot create another or join one", async () => {
	const { t, ana, luis, code } = await couple();
	await luis.mutation(api.household.joinHousehold, { code });
	await expect(luis.mutation(api.household.createHousehold, {})).rejects.toThrow(
		"Ya formas parte de un hogar.",
	);

	const marta = await startUser(t, "marta@correo.com", "Marta Soto");
	await marta.mutation(api.household.createHousehold, {});
	await expect(marta.mutation(api.household.joinHousehold, { code })).rejects.toThrow(
		"Ya formas parte de un hogar.",
	);
	expect((await ana.query(api.household.get, {}))?.partnerName).toBe("Renzo");
});

test("each partner sees the other's real first name; the code leaves once they join", async () => {
	const { ana, luis, code } = await couple();
	expect(await luis.mutation(api.household.joinHousehold, { code })).toEqual({ ok: true });

	expect(await ana.query(api.household.get, {})).toMatchObject({
		partnerName: "Renzo",
		invite: null,
	});
	expect(await luis.query(api.household.get, {})).toMatchObject({
		partnerName: "Camila",
		invite: null,
	});
	expect((await luis.query(api.profiles.myProfile, {}))?.hasHousehold).toBe(true);
});

test("only who created the household is its owner", async () => {
	const { ana, luis, code } = await couple();
	await luis.mutation(api.household.joinHousehold, { code });

	expect((await ana.query(api.household.get, {}))?.isOwner).toBe(true);
	expect((await luis.query(api.household.get, {}))?.isOwner).toBe(false);
});

test("a double tap on join enters once", async () => {
	const { ana, luis, code } = await couple();
	const results = await Promise.allSettled([
		luis.mutation(api.household.joinHousehold, { code }),
		luis.mutation(api.household.joinHousehold, { code }),
	]);
	expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
	expect((await ana.query(api.household.get, {}))?.partnerName).toBe("Renzo");
});

test("the invite works until day 7 and is expired after", async () => {
	const { luis, code } = await couple();
	vi.setSystemTime(new Date(Date.parse(START) + 7 * DAY + 1_000));
	expect(await luis.mutation(api.household.joinHousehold, { code })).toEqual({
		ok: false,
		reason: "expired",
	});

	const fresh = await couple();
	vi.setSystemTime(new Date(Date.parse(START) + 7 * DAY - 1_000));
	expect(await fresh.luis.mutation(api.household.joinHousehold, { code: fresh.code })).toEqual({
		ok: true,
	});
});

test("resending kills the old code and the new one works", async () => {
	const { ana, luis, code } = await couple();
	const next = await ana.mutation(api.household.createInvite, {});
	expect(next.code).not.toBe(code);

	expect(await luis.mutation(api.household.joinHousehold, { code })).toEqual({
		ok: false,
		reason: "invalid",
	});
	expect(await luis.mutation(api.household.joinHousehold, { code: next.code })).toEqual({
		ok: true,
	});
});

test("with 2 members, resending fails and the code does not change", async () => {
	const { t, ana, luis, code } = await couple();
	await luis.mutation(api.household.joinHousehold, { code });

	await expect(ana.mutation(api.household.createInvite, {})).rejects.toThrow(
		"Nuestro espacio ya tiene dos personas.",
	);
	// Same code still on the household, but used up.
	expect(await t.query(api.household.inviteInfo, { code })).toEqual({
		inviterName: "Camila",
		expiresAt: 0,
	});
});

test("a third person with a used code is told it expired", async () => {
	const { t, luis, code } = await couple();
	await luis.mutation(api.household.joinHousehold, { code });
	const marta = await startUser(t, "marta@correo.com", "Marta Soto");
	expect(await marta.mutation(api.household.joinHousehold, { code })).toEqual({
		ok: false,
		reason: "expired",
	});
});

test("a household that already has 2 members answers full to a third person", async () => {
	const { t, luis, code } = await couple();
	// The only path that inserts members is joinHousehold; this puts the second one in by hand.
	await t.run(async (ctx) => {
		const space = await ctx.db
			.query("spaces")
			.withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
			.unique();
		if (!space) throw new Error("missing household");
		await ctx.db.insert("spaceMembers", { spaceId: space._id, userId: "someone-else" });
	});
	expect(await luis.mutation(api.household.joinHousehold, { code })).toEqual({
		ok: false,
		reason: "full",
	});
});

test("a code in lowercase and with spaces joins", async () => {
	const { luis, code } = await couple();
	const typed = ` ${code.slice(0, 3).toLowerCase()} ${code.slice(3).toLowerCase()} `;
	expect(await luis.mutation(api.household.joinHousehold, { code: typed })).toEqual({ ok: true });
});

test("inviteInfo works without a session and gives only the inviter's first name", async () => {
	const { t, code } = await couple();
	const info = await t.query(api.household.inviteInfo, { code: ` ${code.toLowerCase()} ` });
	expect(info?.inviterName).toBe("Camila");
	expect(JSON.stringify(info)).not.toContain("Rojas");
	expect(await t.query(api.household.inviteInfo, { code: "ZZZZZZ" })).toBeNull();
});

test("createHousehold rejects a name that is too long", async () => {
	const t = harness();
	const ana = await startUser(t, "camila@correo.com", "Camila Rojas");
	await expect(
		ana.mutation(api.household.createHousehold, { name: "x".repeat(41) }),
	).rejects.toThrow("Revisa los datos e inténtalo otra vez.");
	expect(await ana.query(api.household.get, {})).toBeNull();
});
