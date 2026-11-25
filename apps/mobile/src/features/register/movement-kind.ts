export type MovementKind = "expense" | "income" | "contribution";

export const NOUNS: Record<MovementKind, string> = {
	expense: "gasto",
	income: "ingreso",
	contribution: "aporte",
};
