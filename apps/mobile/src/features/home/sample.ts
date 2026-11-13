import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type Home = FunctionReturnType<typeof api.balances.getHome>;
type CommitmentList = FunctionReturnType<typeof api.commitments.list>;
type CommitmentId = CommitmentList["items"][number]["id"];

/** Lima date the sample screen pretends is today. */
export const SAMPLE_TODAY = "2026-11-13";

export const SAMPLE_HOME: Home = {
	startDate: "2026-11-01",
	endDate: "2026-12-03",
	needsCents: 101_648,
	wantsCents: 49_250,
	savingsCents: 72_000,
	assigned: {
		needsCents: 130_318,
		wantsCents: 78_175,
		savingsCents: 72_000,
	},
	split: { needs: 50, wants: 30, savings: 20 },
	reserved: {
		needsCents: 5_000,
		wantsCents: 0,
		savingsCents: 0,
	},
	dailyCents: 6_859,
	spentTodayCents: 0,
	leftCents: 6_859,
	overCents: 0,
	tomorrowCents: null,
	daysLeft: 22,
	pendingCents: 5_000,
	planIncomeCents: 300_000,
	empty: false,
	earlyWindow: false,
	earlyIncome: null,
};

export const SAMPLE_COMMITMENTS: CommitmentList = {
	payableCents: 5_000,
	paidCents: 0,
	items: [
		{
			// Excepción: dato de ejemplo, se borra al conectar Convex
			id: "sample_celular" as CommitmentId,
			name: "Celular",
			amountCents: 5_000,
			envelope: "needs",
			frequency: "monthly",
			dueDate: "2026-11-14",
			rule: { kind: "day", day: 14 },
			adjustment: null,
			status: "upcoming",
		},
	],
	payments: [],
};
