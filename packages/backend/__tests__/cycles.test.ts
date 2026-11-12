import { afterEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { ensureOpenCycle } from "../convex/model/cycles";
import { requireSpaceById } from "../convex/model/spaces";
import { type Harness, harness, signIn } from "./couple";

afterEach(() => {
	vi.useRealTimers();
});

const onboard = {
	cadence: "monthly" as const,
	cycleStartDay: 1,
	incomeCents: 150_000,
	todayCents: 50_000,
	split: { needs: 50, wants: 30, savings: 20 },
};

/** Onboard on 20 Oct → first cycle 20–31 Oct. */
async function onboardOct20(t: Harness) {
	const ana = await signIn(t, "ana@correo.com", "Ana");
	vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") });
	await ana.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Ana" });
	return ana;
}

test("requireSpaceById allows your space and rejects someone else's", async () => {
	const t = harness();
	const ana = await signIn(t, "ana@correo.com", "Ana");
	await ana.mutation(api.profiles.completeOnboarding, { ...onboard, name: "Ana" });
	const spaceId = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return space._id;
	});

	await ana.run(async (ctx) => {
		const { space } = await requireSpaceById(ctx, spaceId);
		expect(space._id).toBe(spaceId);
	});

	const luis = await signIn(t, "luis@correo.com", "Luis");
	await expect(luis.run(async (ctx) => requireSpaceById(ctx, spaceId))).rejects.toThrow(
		"No encontramos este dato.",
	);
});

test("ensureOpen creates the next cycle when the previous one already ended", async () => {
	const t = harness();
	const ana = await onboardOct20(t);

	const before = await t.run(async (ctx) => {
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		return { id: cycle._id, endDate: cycle.endDate, spaceId: cycle.spaceId };
	});
	expect(before.endDate).toBe("2026-10-31");

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	const open = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(open).toMatchObject({ startDate: "2026-11-01", endDate: "2026-11-30" });

	const after = await t.run(async (ctx) => {
		const cycles = await ctx.db.query("cycles").take(5);
		const closed = cycles.find((c) => c._id === before.id);
		const next = cycles.find((c) => c._id === open.cycleId);
		const savings = await ctx.db
			.query("transactions")
			.withIndex("by_spaceId_kind", (q) => q.eq("spaceId", before.spaceId).eq("kind", "saving"))
			.take(5);
		return { closed, next, savings };
	});

	expect(after.closed?.closedAt).toEqual(expect.any(Number));
	expect(after.next).toMatchObject({
		startDate: "2026-11-01",
		endDate: "2026-11-30",
		carryIn: { needsCents: 25_000, wantsCents: 15_000 },
		envelopes: { needsCents: 25_000, wantsCents: 15_000, savingsCents: 0 },
	});
	expect(after.savings).toHaveLength(1);
	expect(after.savings[0]).toMatchObject({
		kind: "saving",
		amountCents: 10_000,
		date: "2026-10-31",
	});
});

test("closeCycle moves remaining Ahorro into spaces.fundCents", async () => {
	const t = harness();
	const ana = await onboardOct20(t);
	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const fundCents = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return space.fundCents;
	});
	expect(fundCents).toBe(10_000);
});

test("last day of the cycle stays open", async () => {
	const t = harness();
	const ana = await onboardOct20(t);
	const firstId = await t.run(async (ctx) => (await ctx.db.query("cycles").take(1))[0]._id);

	// 31 Oct noon Lima — still the cycle's last day.
	vi.setSystemTime(new Date("2026-10-31T17:00:00.000Z"));
	const open = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(open.cycleId).toBe(firstId);
	expect(open).toMatchObject({ startDate: "2026-10-20", endDate: "2026-10-31" });

	const closedAt = await t.run(async (ctx) => (await ctx.db.get("cycles", firstId))?.closedAt);
	expect(closedAt == null).toBe(true);
});

test("31 Oct 20:00 Lima does not close even though UTC is already 1 Nov", async () => {
	const t = harness();
	const ana = await onboardOct20(t);
	const firstId = await t.run(async (ctx) => (await ctx.db.query("cycles").take(1))[0]._id);

	// Lima UTC−5: 2026-11-01T01:00Z = 31 Oct 20:00 in Lima.
	vi.setSystemTime(new Date("2026-11-01T01:00:00.000Z"));
	const open = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(open.cycleId).toBe(firstId);
	expect(open.endDate).toBe("2026-10-31");

	const closedAt = await t.run(async (ctx) => (await ctx.db.get("cycles", firstId))?.closedAt);
	expect(closedAt == null).toBe(true);
});

test("opening in January after a short Oct cycle creates Nov, Dec and Jan with no gaps", async () => {
	const t = harness();
	await onboardOct20(t);

	// Call the model with an explicit Lima date: a months-long fake-timer jump
	// expires the Better Auth session and would block api.cycles.ensureOpen.
	const open = await t.run(async (ctx) => {
		const space = (await ctx.db.query("spaces").take(1))[0];
		return ensureOpenCycle(ctx, space, "2027-01-05", space.ownerId);
	});
	expect(open).toMatchObject({ startDate: "2027-01-01", endDate: "2027-01-31" });

	const ranges = await t.run(async (ctx) => {
		const cycles = await ctx.db.query("cycles").take(10);
		return cycles
			.sort((a, b) => a.startDate.localeCompare(b.startDate))
			.map((c) => ({
				startDate: c.startDate,
				endDate: c.endDate,
				closed: c.closedAt != null,
			}));
	});

	expect(ranges).toEqual([
		{ startDate: "2026-10-20", endDate: "2026-10-31", closed: true },
		{ startDate: "2026-11-01", endDate: "2026-11-30", closed: true },
		{ startDate: "2026-12-01", endDate: "2026-12-31", closed: true },
		{ startDate: "2027-01-01", endDate: "2027-01-31", closed: false },
	]);
});

test("the new cycle inherits the previous split", async () => {
	const t = harness();
	const ana = await onboardOct20(t);
	const customSplit = { needs: 40, wants: 40, savings: 20 };

	await t.run(async (ctx) => {
		const cycle = (await ctx.db.query("cycles").take(1))[0];
		await ctx.db.patch("cycles", cycle._id, { split: customSplit });
	});

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	const open = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });

	const nextSplit = await t.run(async (ctx) => (await ctx.db.get("cycles", open.cycleId))?.split);
	expect(nextSplit).toEqual(customSplit);
});

test("calling ensureOpen twice on an already-closed cycle returns the same next cycle", async () => {
	const t = harness();
	const ana = await onboardOct20(t);

	vi.setSystemTime(new Date("2026-11-01T17:00:00.000Z"));
	const first = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	const second = await ana.mutation(api.cycles.ensureOpen, { space: "personal" });
	expect(second.cycleId).toBe(first.cycleId);

	const count = await t.run(async (ctx) => (await ctx.db.query("cycles").take(5)).length);
	expect(count).toBe(2);
});
