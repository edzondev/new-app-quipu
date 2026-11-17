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
		needsCents: 20_900,
		wantsCents: 0,
		savingsCents: 0,
	},
	dailyCents: 6_859,
	spentTodayCents: 0,
	leftCents: 6_859,
	overCents: 0,
	tomorrowCents: null,
	daysLeft: 22,
	pendingCents: 20_900,
	planIncomeCents: 300_000,
	empty: false,
	earlyWindow: false,
	earlyIncome: null,
};

// Excepción: ids de ejemplo, se borran al conectar Convex
const ID_LUZ = "sample_luz" as CommitmentId;
const ID_CELULAR = "sample_celular" as CommitmentId;
const ID_SOAT = "sample_soat" as CommitmentId;
const ID_ALQUILER = "sample_alquiler" as CommitmentId;
const ID_PAGO_ALQUILER = "sample_pago_alquiler" as CommitmentList["payments"][number]["paymentId"];

export const SAMPLE_COMMITMENTS: CommitmentList = {
	payableCents: 20_900,
	paidCents: 90_000,
	items: [
		{
			id: ID_LUZ,
			name: "Luz",
			amountCents: 6_400,
			envelope: "needs",
			frequency: "monthly",
			dueDate: "2026-11-12",
			rule: { kind: "day", day: 12 },
			adjustment: null,
			status: "overdue",
		},
		{
			id: ID_CELULAR,
			name: "Celular",
			amountCents: 5_000,
			envelope: "needs",
			frequency: "monthly",
			dueDate: "2026-11-14",
			rule: { kind: "day", day: 14 },
			adjustment: null,
			status: "upcoming",
		},
		{
			id: ID_SOAT,
			name: "SOAT",
			amountCents: 9_500,
			envelope: "needs",
			frequency: "once",
			dueDate: "2026-11-20",
			rule: null,
			adjustment: null,
			status: "reserved",
		},
		{
			id: ID_ALQUILER,
			name: "Alquiler",
			amountCents: 90_000,
			envelope: "needs",
			frequency: "monthly",
			dueDate: "2026-12-05",
			rule: { kind: "day", day: 5 },
			adjustment: null,
			status: "later",
		},
	],
	payments: [
		{
			paymentId: ID_PAGO_ALQUILER,
			id: ID_ALQUILER,
			name: "Alquiler",
			envelope: "needs",
			amountCents: 90_000,
			paidOn: "2026-11-05",
			dueDate: "2026-11-05",
		},
	],
};
