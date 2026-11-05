import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type Kind = "expense" | "income";

export type Movement = FunctionReturnType<typeof api.transactions.list>["rows"][number];

export type Draft = {
	kind: Kind;
	amount: string;
	id?: Movement["id"];
	note?: string;
	envelope?: "needs" | "wants";
};

export function canEdit(row: Movement) {
	return row.mine && (row.kind === "expense" || row.kind === "income");
}

export function editDraft(row: Movement): Draft {
	return {
		kind: row.kind === "income" ? "income" : "expense",
		amount: (row.amountCents / 100).toFixed(2),
		id: row.id,
		note: row.note ?? "",
		envelope: row.envelope === "wants" ? "wants" : "needs",
	};
}
