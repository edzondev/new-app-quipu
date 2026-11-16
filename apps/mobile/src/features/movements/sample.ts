import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { SAMPLE_HOME } from "@/features/home/sample";

type MovementList = FunctionReturnType<typeof api.transactions.list>;
type Row = MovementList["rows"][number];
type RowId = Row["id"];

const NO_LINKS = {
	toEnvelope: null,
	goalId: null,
	reason: null,
	extra: false,
	startsOn: null,
	mine: true,
	who: null,
} as const;

export const SAMPLE_MOVEMENTS: MovementList = {
	startDate: SAMPLE_HOME.startDate,
	endDate: SAMPLE_HOME.endDate,
	rows: [
		{
			// Excepción: dato de ejemplo, se borra al conectar Convex
			id: "sample_almuerzo" as RowId,
			kind: "expense",
			amountCents: 1_500,
			date: "2026-11-13",
			note: "almuerzo en el menú",
			envelope: "needs",
			...NO_LINKS,
		},
		{
			// Excepción: dato de ejemplo, se borra al conectar Convex
			id: "sample_tambo" as RowId,
			kind: "expense",
			amountCents: 4_590,
			date: "2026-11-13",
			note: "Tambo+",
			envelope: "needs",
			...NO_LINKS,
		},
		{
			// Excepción: dato de ejemplo, se borra al conectar Convex
			id: "sample_cine" as RowId,
			kind: "expense",
			amountCents: 3_200,
			date: "2026-11-12",
			note: "Cine",
			envelope: "wants",
			...NO_LINKS,
		},
		{
			// Excepción: dato de ejemplo, se borra al conectar Convex
			id: "sample_aporte_fondo" as RowId,
			kind: "saving",
			amountCents: 20_000,
			date: "2026-11-12",
			note: null,
			envelope: "savings",
			...NO_LINKS,
		},
		{
			// Excepción: dato de ejemplo, se borra al conectar Convex
			id: "sample_taxi" as RowId,
			kind: "expense",
			amountCents: 1_250,
			date: "2026-11-12",
			note: "Taxi",
			envelope: "needs",
			...NO_LINKS,
		},
		{
			// Excepción: dato de ejemplo, se borra al conectar Convex
			id: "sample_sueldo" as RowId,
			kind: "income",
			amountCents: 300_000,
			date: "2026-11-01",
			note: "Sueldo",
			envelope: null,
			...NO_LINKS,
		},
	],
};
