import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type Home = FunctionReturnType<typeof api.balances.getHome>;

export const SAMPLE_HOUSEHOLD_HOME: Home = {
	startDate: "2026-10-15",
	endDate: "2026-11-14",
	needsCents: 64_000,
	wantsCents: 26_640,
	savingsCents: 18_000,
	assigned: { needsCents: 100_000, wantsCents: 60_000, savingsCents: 18_000 },
	split: { needs: 50, wants: 30, savings: 20 },
	reserved: { needsCents: 0, wantsCents: 0, savingsCents: 0 },
	dailyCents: 4_120,
	spentTodayCents: 0,
	leftCents: 4_120,
	overCents: 0,
	tomorrowCents: null,
	daysLeft: 22,
	pendingCents: 0,
	planIncomeCents: 300_000,
	empty: false,
	earlyWindow: false,
	earlyIncome: null,
};
