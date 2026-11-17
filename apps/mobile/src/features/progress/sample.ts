import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type Streak = FunctionReturnType<typeof api.progress.streak>;
type CycleList = FunctionReturnType<typeof api.progress.list>;
type CycleId = CycleList["cycles"][number]["id"];

export const SAMPLE_STREAK: Streak = { streak: 3, exact: true, hasActive: true };

// Excepción: ids de ejemplo, se borran al conectar Convex
const ID_OCT = "sample_cycle_oct" as CycleId;
const ID_SEP = "sample_cycle_sep" as CycleId;
const ID_AGO = "sample_cycle_ago" as CycleId;
const ID_JUL = "sample_cycle_jul" as CycleId;

export const SAMPLE_CYCLES: CycleList = {
	cycles: [
		{
			id: ID_OCT,
			startDate: "2026-10-01",
			endDate: "2026-10-31",
			marginCents: 9_600,
			left: { needsCents: 11_600, wantsCents: -2_000 },
			detail: {
				kind: "ok",
				assigned: { needsCents: 130_000, wantsCents: 78_000 },
				spent: { needsCents: 118_400, wantsCents: 80_000 },
				fundedCents: 52_000,
			},
		},
		{
			id: ID_SEP,
			startDate: "2026-09-01",
			endDate: "2026-09-30",
			marginCents: 14_000,
			left: { needsCents: 9_000, wantsCents: 5_000 },
			detail: {
				kind: "ok",
				assigned: { needsCents: 130_000, wantsCents: 78_000 },
				spent: { needsCents: 121_000, wantsCents: 73_000 },
				fundedCents: 52_000,
			},
		},
		{
			id: ID_AGO,
			startDate: "2026-08-01",
			endDate: "2026-08-31",
			marginCents: 2_200,
			left: { needsCents: 2_200, wantsCents: 0 },
			detail: {
				kind: "ok",
				assigned: { needsCents: 130_000, wantsCents: 78_000 },
				spent: { needsCents: 127_800, wantsCents: 78_000 },
				fundedCents: 0,
			},
		},
		{
			id: ID_JUL,
			startDate: "2026-07-01",
			endDate: "2026-07-31",
			marginCents: -3_500,
			left: { needsCents: 1_500, wantsCents: -5_000 },
			detail: { kind: "unavailable", reason: "legacy" },
		},
	],
	hidden: 0,
	next: null,
};
