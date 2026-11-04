import rateLimiterTest from "@convex-dev/rate-limiter/test";
import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import authSchema from "../convex/betterAuth/schema";
import { ensureOpenCycle } from "../convex/model/cycles";
import schema from "../convex/schema";
import { getDailyCents } from "../shared/budget";

afterEach(() => {
	vi.useRealTimers();
});

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob("../convex/betterAuth/**/*.ts");

function harness() {
	const t = convexTest(schema, modules);
	t.registerComponent("betterAuth", authSchema, componentModules);
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

test("Luz S/ 50 day 25 lowers daily; markPaid cuts Needs and stops the discount", async () => {
	const t = harness();
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.mutation(api.profiles.completeOnboarding, onboard);

	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Luz",
		amountCents: 5_000,
		envelope: "needs",
		schedule: { frequency: "monthly", dueDay: 25 },
	});

	const before = await ana.query(api.balances.getBalances, { space: "personal" });
	// (250 + 150 − 50) / 12
	expect(before.dailyCents).toBe(2916);
	expect(before.needsCents).toBe(25_000);

	const id = await t.run(async (ctx) => {
		const row = (await ctx.db.query("commitments").take(1))[0];
		return row._id;
	});

	await ana.mutation(api.commitments.markPaid, { space: "personal", id });

	const after = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(after.needsCents).toBe(20_000);
	expect(after.dailyCents).toBe(getDailyCents(20_000 + 15_000, 12));
	expect(after.dailyCents).toBe(2916);
});

test("once commitment paid in October cannot be marked paid again after ensureOpen in November", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, onboard);

	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "SOAT",
		amountCents: 5_000,
		envelope: "needs",
		schedule: { frequency: "once", dueDate: "2026-10-25" },
	});
	const id = await t.run(async (ctx) => {
		const row = (await ctx.db.query("commitments").take(1))[0];
		return row._id;
	});
	await ana.mutation(api.commitments.markPaid, { space: "personal", id });

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	await expect(ana.mutation(api.commitments.markPaid, { space: "personal", id })).rejects.toThrow(
		"Este compromiso ya está pagado en este ciclo.",
	);
});

type Ana = Awaited<ReturnType<typeof signIn>>;

// Sign in under the fake clock: convex-test never lets _creationTime go back, so a real-time
// sign-in would date every commitment today. Better Auth sessions last 7 days; stretch it to reach December.
async function startAnaAt(
	t: ReturnType<typeof harness>,
	now: string,
	plan: Omit<typeof onboard, "cadence"> & { cadence: "monthly" | "biweekly" },
) {
	vi.useFakeTimers({ now: new Date(now) });
	const ana = await signIn(t, "ana@correo.com", "Ana");
	const user = await t.query(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [{ field: "email", value: "ana@correo.com" }],
	});
	await t.mutation(components.betterAuth.adapter.updateOne, {
		input: {
			model: "session",
			where: [{ field: "userId", value: user._id }],
			update: { expiresAt: Date.UTC(2027, 0, 1) },
		},
	});
	await ana.mutation(api.profiles.completeOnboarding, plan);
	return ana;
}

function startAnaOct20(t: ReturnType<typeof harness>) {
	return startAnaAt(t, "2026-10-20T17:00:00.000Z", onboard);
}

function addLuz(ana: Ana) {
	return ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Luz",
		amountCents: 5_000,
		envelope: "needs",
		schedule: { frequency: "monthly", dueDay: 25 },
	});
}

function addSoat(ana: Ana) {
	return ana.mutation(api.commitments.add, {
		space: "personal",
		name: "SOAT",
		amountCents: 8_000,
		envelope: "needs",
		schedule: { frequency: "once", dueDate: "2026-10-22" },
	});
}

function firstCommitmentId(t: ReturnType<typeof harness>) {
	return t.run(async (ctx) => (await ctx.db.query("commitments").take(1))[0]._id);
}

async function luzUnpaidIntoNovember(t: ReturnType<typeof harness>) {
	const ana = await startAnaOct20(t);
	await addLuz(ana);
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	return ana;
}

test("overdue unpaid Luz stays reserved", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addLuz(ana);

	vi.setSystemTime(new Date("2026-10-26T17:00:00.000Z"));
	// Ciclo 2026-10-20 → 2026-10-31. Hoy 26 oct: quedan 6 días. Luz venció el 25 sin pagar.
	// (25_000 + 15_000 − 5_000) / 6 = 5_833
	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(balances.dailyCents).toBe(5_833);
	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-26" });
	expect(home.pendingCents).toBe(5_000);
});

test("a one-off commitment is reserved before and after its due date", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addSoat(ana);

	// Ciclo 2026-10-20 → 2026-10-31. Hoy 20 oct: quedan 12 días. (40_000 − 8_000) / 12 = 2_666
	const day20 = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(day20.pendingCents).toBe(8_000);
	expect(day20.dailyCents).toBe(2_666);

	vi.setSystemTime(new Date("2026-10-23T17:00:00.000Z"));
	// Hoy 23 oct: SOAT venció el 22 sin pagar, quedan 9 días. (40_000 − 8_000) / 9 = 3_555
	const day23 = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-23" });
	expect(day23.pendingCents).toBe(8_000);
	expect(day23.dailyCents).toBe(3_555);
});

test("unpaid Luz carries into the next cycle next to the new charge", async () => {
	const t = harness();
	const ana = await luzUnpaidIntoNovember(t);

	// Ciclo 2026-11-01 → 2026-11-30, 30 días. Dos cargos de 5_000: la Luz vencida del 25 oct
	// y la Luz del 25 nov. Arrastra 25_000 + 15_000. (40_000 − 10_000) / 30 = 1_000
	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	expect(home.pendingCents).toBe(10_000);
	expect(home.dailyCents).toBe(1_000);
	expect(home.dueSoon[0].dueDate).toBe("2026-10-25");
});

test("markPaid settles the oldest charge first and never pays ahead", async () => {
	const t = harness();
	const ana = await luzUnpaidIntoNovember(t);
	const id = await firstCommitmentId(t);
	const home = () => ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });

	// Ciclo 2026-11-01 → 2026-11-30, 30 días. Pagar mueve 5_000 de Necesidades a pagado y quita
	// 5_000 de lo reservado, así que el número del día no cambia: (40_000 − 10_000) / 30 = 1_000.
	await ana.mutation(api.commitments.markPaid, { space: "personal", id });
	const first = await home();
	// Paga la Luz del 25 oct. (20_000 + 15_000 − 5_000) / 30 = 1_000
	expect(first.needsCents).toBe(20_000);
	expect(first.pendingCents).toBe(5_000);
	expect(first.dueSoon[0].dueDate).toBe("2026-11-25");
	expect(first.dailyCents).toBe(1_000);

	await ana.mutation(api.commitments.markPaid, { space: "personal", id });
	const second = await home();
	// Paga la Luz del 25 nov. (15_000 + 15_000 − 0) / 30 = 1_000
	expect(second.needsCents).toBe(15_000);
	expect(second.pendingCents).toBe(0);
	expect(second.dailyCents).toBe(1_000);

	// La Luz del 25 dic es del ciclo siguiente: no se paga por adelantado.
	await expect(ana.mutation(api.commitments.markPaid, { space: "personal", id })).rejects.toThrow(
		"Este compromiso ya está pagado en este ciclo.",
	);
	expect((await home()).dailyCents).toBe(1_000);
});

test("a paid one-off is never reserved again", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addSoat(ana);
	await ana.mutation(api.commitments.markPaid, {
		space: "personal",
		id: await firstCommitmentId(t),
	});

	// Ciclo 2026-10-20 → 2026-10-31. SOAT pagado el 20 oct: nada reservado.
	const oct = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(oct.pendingCents).toBe(0);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	// Ciclo 2026-11-01 → 2026-11-30.
	const nov = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	expect(nov.pendingCents).toBe(0);

	await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		await ensureOpenCycle(ctx, space, "2026-12-01", space.ownerId);
	});
	// Ciclo 2026-12-01 → 2026-12-31.
	const dec = await ana.query(api.balances.getHome, { space: "personal", today: "2026-12-01" });
	expect(dec.pendingCents).toBe(0);
});

test("an unpaid one-off carries into the next cycle", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addSoat(ana);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	// Ciclo 2026-11-01 → 2026-11-30. SOAT venció el 22 oct sin pagar: sigue reservado.
	const home = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	expect(home.pendingCents).toBe(8_000);
});

test("deleting the expense that paid Luz reopens the charge", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addLuz(ana);
	const id = await firstCommitmentId(t);
	vi.setSystemTime(new Date("2026-10-26T17:00:00.000Z"));
	const home = () => ana.query(api.balances.getHome, { space: "personal", today: "2026-10-26" });

	// Ciclo 2026-10-20 → 2026-10-31. Hoy 26 oct: quedan 6 días. Pagar o borrar el pago mueve
	// 5_000 entre saldo y reservado; el número del día no cambia.
	await ana.mutation(api.commitments.markPaid, { space: "personal", id });
	const paid = await home();
	// (20_000 + 15_000 − 0) / 6 = 5_833
	expect(paid.needsCents).toBe(20_000);
	expect(paid.pendingCents).toBe(0);
	expect(paid.dailyCents).toBe(5_833);

	const expenseId = await t.run(async (ctx) => {
		const tx = await ctx.db
			.query("transactions")
			.withIndex("by_commitmentId", (q) => q.eq("commitmentId", id))
			.first();
		if (!tx) throw new Error("Luz payment not found");
		return tx._id;
	});
	await ana.mutation(api.transactions.deleteExpense, { space: "personal", id: expenseId });
	const reopened = await home();
	// (25_000 + 15_000 − 5_000) / 6 = 5_833
	expect(reopened.needsCents).toBe(25_000);
	expect(reopened.pendingCents).toBe(5_000);
	expect(reopened.dailyCents).toBe(5_833);
});

test("a commitment only counts from the day it was created", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Alquiler",
		amountCents: 20_000,
		envelope: "needs",
		schedule: { frequency: "monthly", dueDay: 1 },
	});

	// Ciclo 2026-10-20 → 2026-10-31. El 1 oct es antes de crearlo y el 1 nov cae fuera del ciclo.
	const oct = await ana.query(api.balances.getHome, { space: "personal", today: "2026-10-20" });
	expect(oct.pendingCents).toBe(0);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	// Ciclo 2026-11-01 → 2026-11-30, 30 días. (40_000 − 20_000) / 30 = 666
	const nov = await ana.query(api.balances.getHome, { space: "personal", today: "2026-11-01" });
	expect(nov.pendingCents).toBe(20_000);
	expect(nov.dailyCents).toBe(666);
});

test("list shows each commitment's state with the to-pay and already-paid totals", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addLuz(ana);
	await addSoat(ana);
	vi.setSystemTime(new Date("2026-10-23T17:00:00.000Z"));
	const list = () => ana.query(api.commitments.list, { space: "personal", today: "2026-10-23" });

	const before = await list();
	expect(before.items.map(({ name, status, dueDate }) => ({ name, status, dueDate }))).toEqual([
		{ name: "SOAT", status: "overdue", dueDate: "2026-10-22" },
		{ name: "Luz", status: "upcoming", dueDate: "2026-10-25" },
	]);
	expect(before.payableCents).toBe(13_000);
	expect(before.paidCents).toBe(0);

	const soat = before.items[0].id;
	await ana.mutation(api.commitments.markPaid, { space: "personal", id: soat });

	const after = await list();
	expect(after.items.map(({ name, status }) => ({ name, status }))).toEqual([
		{ name: "Luz", status: "upcoming" },
	]);
	expect(after.payments).toEqual([
		{
			id: soat,
			name: "SOAT",
			envelope: "needs",
			amountCents: 8_000,
			paidOn: "2026-10-23",
			dueDate: "2026-10-22",
		},
	]);
	expect(after.payableCents).toBe(5_000);
	expect(after.paidCents).toBe(8_000);
});

test("paying S/ 45 for a S/ 50 commitment cuts Needs by 4_500 and counts 4_500 as paid", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addLuz(ana);
	const id = await firstCommitmentId(t);

	await ana.mutation(api.commitments.markPaid, { space: "personal", id, amountCents: 4_500 });

	const balances = await ana.query(api.balances.getBalances, { space: "personal" });
	expect(balances.needsCents).toBe(25_000 - 4_500);
	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-10-20" });
	expect(list.payments).toMatchObject([
		{ name: "Luz", amountCents: 4_500, dueDate: "2026-10-25", paidOn: "2026-10-20" },
	]);
	expect(list.paidCents).toBe(4_500);
	expect(list.payableCents).toBe(0);
});

test("markPaid rejects an amount that is not positive whole cents", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addLuz(ana);
	const id = await firstCommitmentId(t);

	for (const amountCents of [0, -500, 45.5]) {
		await expect(
			ana.mutation(api.commitments.markPaid, { space: "personal", id, amountCents }),
		).rejects.toThrow("Revisa los datos e inténtalo otra vez.");
	}
});

test("a one-off dated after the cycle end can be paid ahead", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Seguro",
		amountCents: 6_000,
		envelope: "needs",
		schedule: { frequency: "once", dueDate: "2026-11-05" },
	});
	const id = await firstCommitmentId(t);
	const list = () => ana.query(api.commitments.list, { space: "personal", today: "2026-10-20" });

	const before = await list();
	expect(before.items[0].status).toBe("later");
	expect(before.items[0].frequency).toBe("once");
	expect(before.payableCents).toBe(0);

	await ana.mutation(api.commitments.markPaid, { space: "personal", id });

	const after = await list();
	expect(after.items).toEqual([]);
	expect(after.payments).toMatchObject([
		{ name: "Seguro", amountCents: 6_000, dueDate: "2026-11-05", paidOn: "2026-10-20" },
	]);
	expect(after.paidCents).toBe(6_000);
	expect((await ana.query(api.balances.getBalances, { space: "personal" })).needsCents).toBe(
		25_000 - 6_000,
	);
});

test("a monthly with no charge left in the cycle still lists its next due date, and cannot be paid ahead", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	vi.setSystemTime(new Date("2026-10-26T17:00:00.000Z"));
	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Internet",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "monthly", dueDay: 15 },
	});
	const id = await firstCommitmentId(t);

	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-10-26" });
	expect(list.items.map(({ name, status, dueDate }) => ({ name, status, dueDate }))).toEqual([
		{ name: "Internet", status: "later", dueDate: "2026-11-15" },
	]);
	expect(list.payableCents).toBe(0);

	await expect(ana.mutation(api.commitments.markPaid, { space: "personal", id })).rejects.toThrow(
		"Este compromiso ya está pagado en este ciclo.",
	);
});

test("list shows the oldest open charge, not the newest one", async () => {
	const t = harness();
	const ana = await luzUnpaidIntoNovember(t);

	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-11-01" });
	expect(list.items.map(({ name, status, dueDate }) => ({ name, status, dueDate }))).toEqual([
		{ name: "Luz", status: "overdue", dueDate: "2026-10-25" },
	]);
});

test("a monthly due after the cycle end, listed before its day, shows next month's date as later", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Internet",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "monthly", dueDay: 5 },
	});

	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-10-23" });
	expect(
		list.items.map(({ name, status, dueDate, frequency }) => ({
			name,
			status,
			dueDate,
			frequency,
		})),
	).toEqual([{ name: "Internet", status: "later", dueDate: "2026-11-05", frequency: "monthly" }]);
	expect(list.payableCents).toBe(0);
});

test("a monthly last paid in the previous cycle is listed as later, not as paid", async () => {
	const t = harness();
	const ana = await startAnaAt(t, "2026-11-01T17:00:00.000Z", {
		...onboard,
		cadence: "biweekly",
	});
	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Internet",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "monthly", dueDay: 5 },
	});
	await ana.mutation(api.commitments.markPaid, {
		space: "personal",
		id: await firstCommitmentId(t),
	});

	vi.setSystemTime(new Date("2026-11-20T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-11-20" });
	expect(list.items.map(({ name, status, dueDate }) => ({ name, status, dueDate }))).toEqual([
		{ name: "Internet", status: "later", dueDate: "2026-12-05" },
	]);
	expect(list.paidCents).toBe(0);
});

test("paidCents only counts payments made in the current cycle", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addLuz(ana);
	await ana.mutation(api.commitments.markPaid, {
		space: "personal",
		id: await firstCommitmentId(t),
	});

	const october = await ana.query(api.commitments.list, { space: "personal", today: "2026-10-20" });
	expect(october.paidCents).toBe(5_000);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const november = await ana.query(api.commitments.list, {
		space: "personal",
		today: "2026-11-01",
	});
	expect(november.paidCents).toBe(0);
});

test("a one-off paid in an earlier cycle stays listed as paid with what was paid, and paidCents leaves it out", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await addSoat(ana);
	await ana.mutation(api.commitments.markPaid, {
		space: "personal",
		id: await firstCommitmentId(t),
		amountCents: 7_500,
	});

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-11-01" });
	expect(list.items).toMatchObject([
		{
			name: "SOAT",
			status: "paid",
			dueDate: "2026-10-22",
			paidOn: "2026-10-20",
			amountCents: 7_500,
		},
	]);
	expect(list.payments).toEqual([]);
	expect(list.paidCents).toBe(0);
});

test("a monthly overdue from the last cycle and paid in this one lists the payment and its next charge", async () => {
	const t = harness();
	const ana = await startAnaAt(t, "2026-10-20T17:00:00.000Z", { ...onboard, cadence: "biweekly" });
	await addLuz(ana);
	vi.setSystemTime(new Date("2026-11-03T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	await ana.mutation(api.commitments.markPaid, {
		space: "personal",
		id: await firstCommitmentId(t),
	});

	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-11-03" });
	expect(list.items).toMatchObject([{ name: "Luz", status: "later", dueDate: "2026-11-25" }]);
	expect(list.payments).toMatchObject([
		{ name: "Luz", amountCents: 5_000, dueDate: "2026-10-25", paidOn: "2026-11-03" },
	]);
	expect(list.paidCents).toBe(5_000);
	expect(list.payableCents).toBe(0);
});

test("a charge due on the cycle's first day is listed as itself, open and then paid", async () => {
	const t = harness();
	const ana = await startAnaOct20(t);
	await ana.mutation(api.commitments.add, {
		space: "personal",
		name: "Internet",
		amountCents: 9_000,
		envelope: "needs",
		schedule: { frequency: "monthly", dueDay: 1 },
	});
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	const list = () => ana.query(api.commitments.list, { space: "personal", today: "2026-11-01" });

	expect((await list()).items).toMatchObject([{ status: "upcoming", dueDate: "2026-11-01" }]);

	await ana.mutation(api.commitments.markPaid, {
		space: "personal",
		id: await firstCommitmentId(t),
	});

	const paid = await list();
	expect(paid.items).toMatchObject([{ status: "later", dueDate: "2026-12-01" }]);
	expect(paid.payments).toMatchObject([
		{ amountCents: 9_000, dueDate: "2026-11-01", paidOn: "2026-11-01" },
	]);
	expect(paid.paidCents).toBe(9_000);
});

// Biweekly: Luz of 25 Oct is forgotten, so on 20 Nov it and the 25 Nov charge are both still ahead of the payments.
async function luzForgottenIntoNovember20(t: ReturnType<typeof harness>) {
	const ana = await startAnaAt(t, "2026-10-20T17:00:00.000Z", { ...onboard, cadence: "biweekly" });
	await addLuz(ana);
	vi.setSystemTime(new Date("2026-11-20T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	return ana;
}

test("two overdue charges paid in this cycle list two payments, and paidCents is their sum", async () => {
	const t = harness();
	const ana = await luzForgottenIntoNovember20(t);
	const id = await firstCommitmentId(t);

	await ana.mutation(api.commitments.markPaid, { space: "personal", id, amountCents: 4_000 });
	vi.setSystemTime(new Date("2026-11-26T17:00:00.000Z"));
	await ana.mutation(api.commitments.markPaid, { space: "personal", id });

	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-11-26" });
	expect(list.payments).toMatchObject([
		{ name: "Luz", amountCents: 4_000, dueDate: "2026-10-25", paidOn: "2026-11-20" },
		{ name: "Luz", amountCents: 5_000, dueDate: "2026-11-25", paidOn: "2026-11-26" },
	]);
	expect(list.paidCents).toBe(9_000);
	expect(list.items).toMatchObject([{ name: "Luz", status: "later", dueDate: "2026-12-25" }]);
});

test("two overdue charges with only the oldest paid list one payment and keep Luz overdue", async () => {
	const t = harness();
	const ana = await luzForgottenIntoNovember20(t);
	vi.setSystemTime(new Date("2026-11-26T17:00:00.000Z"));
	await ana.mutation(api.commitments.markPaid, {
		space: "personal",
		id: await firstCommitmentId(t),
	});

	const list = await ana.query(api.commitments.list, { space: "personal", today: "2026-11-26" });
	expect(list.payments).toMatchObject([
		{ name: "Luz", amountCents: 5_000, dueDate: "2026-10-25", paidOn: "2026-11-26" },
	]);
	expect(list.paidCents).toBe(5_000);
	expect(list.items).toMatchObject([{ name: "Luz", status: "overdue", dueDate: "2026-11-25" }]);
	expect(list.payableCents).toBe(5_000);
});
