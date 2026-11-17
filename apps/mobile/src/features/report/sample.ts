import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type ClosedCycle = FunctionReturnType<typeof api.progress.list>["cycles"][number];

const ID_SEP = "sample_report_sep" as ClosedCycle["id"];

export const SAMPLE_REPORT_CYCLE: ClosedCycle = {
	id: ID_SEP,
	startDate: "2026-09-15",
	endDate: "2026-10-14",
	marginCents: 9_600,
	left: { needsCents: 6_120, wantsCents: 3_480 },
	detail: {
		kind: "ok",
		assigned: { needsCents: 130_000, wantsCents: 78_000 },
		spent: { needsCents: 123_880, wantsCents: 74_520 },
		fundedCents: 72_000,
	},
};
