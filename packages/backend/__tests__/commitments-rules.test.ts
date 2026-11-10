import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { DueRule } from "../shared/commitments";
import { DAY, harness, joinedCouple, setTrialEnd, startUser } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const TODAY = "2026-10-20";
const personal = "personal" as const;
const household = "household" as const;
const day = (n: number): DueRule => ({ kind: "day", day: n });

function add(
	user: Awaited<ReturnType<typeof startUser>>,
	space: "personal" | "household",
	name: string,
	rule: DueRule,
) {
	return user.as.mutation(api.commitments.add, {
		space,
		name,
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "monthly", rule },
	});
}

async function items(
	user: { as: Awaited<ReturnType<typeof startUser>>["as"] },
	space: "personal" | "household" = personal,
) {
	return (await user.as.query(api.commitments.list, { space, today: TODAY })).items;
}

async function personalUser() {
	const t = harness();
	return { t, ana: await startUser(t, "ana@correo.com", "Ana Paz") };
}

test("a rule shows its date in the open cycle and its text data", async () => {
	const { ana } = await personalUser();
	await add(ana, personal, "Agua", { kind: "last" });
	const [item] = await items(ana);
	expect(item).toMatchObject({ dueDate: "2026-10-31", rule: { kind: "last" }, adjusted: false });
});

test("an old row with only dueDay gives the same date as the same rule", async () => {
	const { t, ana } = await personalUser();
	await add(ana, personal, "Nuevo", day(25));
	await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(5)).find((row) => row.kind === "personal");
		if (!space) throw new Error("missing space");
		await ctx.db.insert("commitments", {
			spaceId: space._id,
			name: "Viejo",
			amountCents: 9_000,
			envelope: "needs",
			frequency: "monthly",
			dueDay: 25,
		});
	});
	const rows = await items(ana);
	const old = rows.find((row) => row.name === "Viejo");
	const fresh = rows.find((row) => row.name === "Nuevo");
	expect(old?.dueDate).toBe("2026-10-25");
	expect(old?.dueDate).toBe(fresh?.dueDate);
	expect(old?.rule).toEqual({ kind: "day", day: 25 });
	expect(old?.status).toBe(fresh?.status);
});

test("an old row can be adjusted and edited, and editing turns it into a rule", async () => {
	const { t, ana } = await personalUser();
	const id = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(5)).find((row) => row.kind === "personal");
		if (!space) throw new Error("missing space");
		return await ctx.db.insert("commitments", {
			spaceId: space._id,
			name: "Viejo",
			amountCents: 9_000,
			envelope: "needs",
			frequency: "monthly",
			dueDay: 25,
		});
	});
	await ana.as.mutation(api.commitments.setDueThisMonth, {
		space: personal,
		id,
		month: "2026-10",
		day: 22,
	});
	expect((await items(ana))[0]).toMatchObject({ dueDate: "2026-10-22", adjusted: true });

	await ana.as.mutation(api.commitments.update, {
		space: personal,
		id,
		name: "Viejo",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "monthly", rule: { kind: "mid" } },
	});
	// The one-month change is kept; the rule underneath is now the new one.
	expect((await items(ana))[0]).toMatchObject({ dueDate: "2026-10-22", rule: { kind: "mid" } });
	await ana.as.mutation(api.commitments.clearDueThisMonth, { space: personal, id });
	// The 15th already passed this month, so the rule shows the next one.
	expect((await items(ana))[0]).toMatchObject({ dueDate: "2026-11-15", adjusted: false });
});

test("setting this month moves one month; clearing goes back to the rule", async () => {
	const { ana } = await personalUser();
	await add(ana, personal, "Agua", day(28));
	const [agua] = await items(ana);
	if (!agua) throw new Error("missing item");

	await ana.as.mutation(api.commitments.setDueThisMonth, {
		space: personal,
		id: agua.id,
		month: "2026-10",
		day: 27,
	});
	expect((await items(ana))[0]).toMatchObject({ dueDate: "2026-10-27", adjusted: true });

	await ana.as.mutation(api.commitments.clearDueThisMonth, { space: personal, id: agua.id });
	expect((await items(ana))[0]).toMatchObject({ dueDate: "2026-10-28", adjusted: false });
});

test("the next month goes back to the rule on its own", async () => {
	const { ana } = await personalUser();
	await add(ana, personal, "Agua", day(28));
	const [agua] = await items(ana);
	if (!agua) throw new Error("missing item");
	await ana.as.mutation(api.commitments.setDueThisMonth, {
		space: personal,
		id: agua.id,
		month: "2026-10",
		day: 27,
	});
	await ana.as.mutation(api.commitments.markPaid, { space: personal, id: agua.id });

	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: personal });
	const next = await ana.as.query(api.commitments.list, { space: personal, today: "2026-11-16" });
	expect(next.items[0]).toMatchObject({ dueDate: "2026-11-28", adjusted: false });
});

test("an adjusted day before the commitment existed counts as overdue", async () => {
	const { ana } = await personalUser();
	await add(ana, personal, "Agua", day(28));
	const [agua] = await items(ana);
	if (!agua) throw new Error("missing item");
	await ana.as.mutation(api.commitments.setDueThisMonth, {
		space: personal,
		id: agua.id,
		month: "2026-10",
		day: 10,
	});
	expect((await items(ana))[0]).toMatchObject({ dueDate: "2026-10-10", status: "overdue" });
});

test("the day must exist in that month and the month must be a month", async () => {
	const { ana } = await personalUser();
	await add(ana, personal, "Agua", day(28));
	const [agua] = await items(ana);
	if (!agua) throw new Error("missing item");
	const set = (month: string, dayNumber: number) =>
		ana.as.mutation(api.commitments.setDueThisMonth, {
			space: personal,
			id: agua.id,
			month,
			day: dayNumber,
		});
	await expect(set("2026-02", 30)).rejects.toThrow();
	await expect(set("2026-04", 31)).rejects.toThrow();
	await expect(set("2026-10", 0)).rejects.toThrow();
	await expect(set("octubre", 10)).rejects.toThrow();
	await expect(set("2026-13", 10)).rejects.toThrow();
	await set("2028-02", 29);
	await set("2026-10", 31);
});

test("a one-off commitment has no month to adjust", async () => {
	const { ana } = await personalUser();
	await ana.as.mutation(api.commitments.add, {
		space: personal,
		name: "Seguro",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "once", dueDate: "2026-11-02" },
	});
	const [seguro] = await items(ana);
	if (!seguro) throw new Error("missing item");
	expect(seguro).toMatchObject({ rule: null, adjusted: false });
	await expect(
		ana.as.mutation(api.commitments.setDueThisMonth, {
			space: personal,
			id: seguro.id,
			month: "2026-11",
			day: 3,
		}),
	).rejects.toThrow("No encontramos este dato.");
});

test("rules outside their range are refused", async () => {
	const { ana } = await personalUser();
	for (const rule of [day(0), day(32), { kind: "beforeEnd" as const, days: 11 }]) {
		await expect(add(ana, personal, "Mal", rule)).rejects.toThrow();
	}
	expect(await items(ana)).toEqual([]);
});

test("two commitments due the same day keep the order they had", async () => {
	const { ana } = await personalUser();
	await add(ana, personal, "Primero", day(31));
	await add(ana, personal, "Segundo", { kind: "last" });
	await add(ana, personal, "Tercero", { kind: "beforeEnd", days: 1 });
	const rows = await items(ana);
	expect(rows.map((row) => [row.name, row.dueDate])).toEqual([
		["Tercero", "2026-10-30"],
		["Primero", "2026-10-31"],
		["Segundo", "2026-10-31"],
	]);
});

test("in the household both adjust, it counts in the activity, and nothing changes if the date is the same", async () => {
	const { ana, luis } = await joinedCouple();
	await add(ana, household, "Internet", day(28));
	const [internet] = await items(ana, household);
	if (!internet) throw new Error("missing item");

	await luis.as.mutation(api.commitments.setDueThisMonth, {
		space: household,
		id: internet.id,
		month: "2026-10",
		day: 27,
	});
	expect((await items(ana, household))[0]).toMatchObject({ dueDate: "2026-10-27", adjusted: true });
	await luis.as.mutation(api.commitments.setDueThisMonth, {
		space: household,
		id: internet.id,
		month: "2026-10",
		day: 27,
	});
	await ana.as.mutation(api.commitments.clearDueThisMonth, { space: household, id: internet.id });
	await ana.as.mutation(api.commitments.clearDueThisMonth, { space: household, id: internet.id });

	const { events } = await ana.as.query(api.activity.list, {});
	const edits = events.filter((event) => event.type === "commitment_edited").reverse();
	expect(edits.map((event) => [event.who, event.detail, event.before, event.after])).toEqual([
		["Renzo", "Internet", "28 oct", "27 oct"],
		["Camila", "Internet", "27 oct", "28 oct"],
	]);
});

test("with the Plus lapsed, the household cannot adjust", async () => {
	const { t, ana, luis } = await joinedCouple();
	await add(ana, household, "Internet", day(28));
	const [internet] = await items(ana, household);
	if (!internet) throw new Error("missing item");
	await setTrialEnd(t, ana.userId, Date.now() - DAY);
	await setTrialEnd(t, luis.userId, Date.now() - DAY);
	const readOnly = "Solo lectura. Activa Plus para seguir anotando.";
	await expect(
		ana.as.mutation(api.commitments.setDueThisMonth, {
			space: household,
			id: internet.id,
			month: "2026-10",
			day: 27,
		}),
	).rejects.toThrow(readOnly);
	await expect(
		luis.as.mutation(api.commitments.clearDueThisMonth, { space: household, id: internet.id }),
	).rejects.toThrow(readOnly);
});

async function paymentRows(t: Awaited<ReturnType<typeof personalUser>>["t"]) {
	return await t.run(async (ctx) => {
		const rows = await ctx.db.query("transactions").take(50);
		return rows.flatMap((row) =>
			row.kind === "expense" && row.commitmentId
				? [{ forMonth: row.forMonth, date: row.date }]
				: [],
		);
	});
}

test("a payment keeps covering its month when the rule changes", async () => {
	const { t, ana } = await personalUser();
	await add(ana, personal, "Agua", day(28));
	const [agua] = await items(ana);
	if (!agua) throw new Error("missing item");
	await ana.as.mutation(api.commitments.markPaid, { space: personal, id: agua.id });
	expect(await paymentRows(t)).toEqual([{ forMonth: "2026-10", date: TODAY }]);

	await ana.as.mutation(api.commitments.update, {
		space: personal,
		id: agua.id,
		name: "Agua",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "monthly", rule: { kind: "mid" } },
	});
	// October is still paid (its payment stays in the list); November waits, unpaid.
	const after = await ana.as.query(api.commitments.list, { space: personal, today: TODAY });
	expect(after.paidCents).toBe(9_000);
	expect(after.items[0]).toMatchObject({ dueDate: "2026-11-15", status: "later" });

	vi.setSystemTime(new Date("2026-11-16T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: personal });
	const november = await ana.as.query(api.commitments.list, {
		space: personal,
		today: "2026-11-16",
	});
	expect(november.items[0]).toMatchObject({ dueDate: "2026-11-15", status: "overdue" });
	await ana.as.mutation(api.commitments.markPaid, { space: personal, id: agua.id });
	expect((await paymentRows(t)).map((row) => row.forMonth)).toEqual(["2026-10", "2026-11"]);
});

test("a payment made late still covers the month it was due", async () => {
	const { t, ana } = await personalUser();
	await add(ana, personal, "Agua", day(28));
	const [agua] = await items(ana);
	if (!agua) throw new Error("missing item");
	vi.setSystemTime(new Date("2026-11-03T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: personal });
	await ana.as.mutation(api.commitments.markPaid, { space: personal, id: agua.id });
	expect(await paymentRows(t)).toEqual([{ forMonth: "2026-10", date: "2026-11-03" }]);
	const list = await ana.as.query(api.commitments.list, { space: personal, today: "2026-11-03" });
	expect(list.payments[0]).toMatchObject({ dueDate: "2026-10-28", paidOn: "2026-11-03" });
});

test("a payment saved before payments knew their month still settles the oldest open date", async () => {
	const { t, ana } = await personalUser();
	await add(ana, personal, "Agua", day(25));
	const [agua] = await items(ana);
	if (!agua) throw new Error("missing item");
	await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(5)).find((row) => row.kind === "personal");
		const cycle = await ctx.db.query("cycles").first();
		if (!space || !cycle) throw new Error("missing space");
		await ctx.db.insert("transactions", {
			kind: "expense",
			spaceId: space._id,
			cycleId: cycle._id,
			userId: ana.userId,
			amountCents: 9_000,
			date: TODAY,
			envelope: "needs",
			commitmentId: agua.id,
		});
	});
	expect((await items(ana))[0]).toMatchObject({ dueDate: "2026-11-25", status: "later" });

	// The next payment is a new one: it knows its month and takes the date that is left.
	vi.setSystemTime(new Date("2026-11-26T17:00:00.000Z"));
	await ana.as.mutation(api.cycles.ensureOpen, { space: personal });
	await ana.as.mutation(api.commitments.markPaid, { space: personal, id: agua.id });
	expect((await paymentRows(t)).map((row) => row.forMonth)).toEqual([undefined, "2026-11"]);
	const list = await ana.as.query(api.commitments.list, { space: personal, today: "2026-11-26" });
	expect(list.items[0]?.status).not.toBe("paid");
	expect(list.items[0]?.dueDate).toBe("2026-12-25");
});

test("a one-off commitment is settled by any payment, also after its date moves", async () => {
	const { ana } = await personalUser();
	await ana.as.mutation(api.commitments.add, {
		space: personal,
		name: "Seguro",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "once", dueDate: "2026-10-25" },
	});
	const [seguro] = await items(ana);
	if (!seguro) throw new Error("missing item");
	await ana.as.mutation(api.commitments.markPaid, { space: personal, id: seguro.id });
	await ana.as.mutation(api.commitments.update, {
		space: personal,
		id: seguro.id,
		name: "Seguro",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "once", dueDate: "2026-12-05" },
	});
	const list = await ana.as.query(api.commitments.list, { space: personal, today: TODAY });
	expect(list.payments).toHaveLength(1);
	expect(list.items.some((item) => item.status !== "paid" && item.name === "Seguro")).toBe(false);
});
