import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type Fund = FunctionReturnType<typeof api.goals.fund>;
type GoalList = FunctionReturnType<typeof api.goals.list>;
type GoalId = GoalList[number]["id"];

export const SAMPLE_FUND: Fund = {
	fundCents: 305_200,
	fundGoalCents: 540_000,
	suggestedFundGoalCents: 540_000,
};

export const SAMPLE_GOALS: GoalList = [
	{
		// Excepción: dato de ejemplo, se borra al conectar Convex
		id: "sample_cusco" as GoalId,
		name: "Viaje a Cusco",
		targetCents: 200_000,
		targetMonth: "2027-03",
		savedCents: 124_000,
	},
	{
		// Excepción: dato de ejemplo, se borra al conectar Convex
		id: "sample_laptop" as GoalId,
		name: "Laptop nueva",
		targetCents: 350_000,
		targetMonth: null,
		savedCents: 68_000,
	},
	{
		// Excepción: dato de ejemplo, se borra al conectar Convex
		id: "sample_curso" as GoalId,
		name: "Curso de diseño",
		targetCents: 60_000,
		targetMonth: null,
		savedCents: 60_000,
	},
	{
		// Excepción: dato de ejemplo, se borra al conectar Convex
		id: "sample_ingles" as GoalId,
		name: "Curso de inglés",
		targetCents: 120_000,
		targetMonth: null,
		savedCents: 30_000,
	},
];
