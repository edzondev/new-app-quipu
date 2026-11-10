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

/** A saving or a withdrawal opens Aportar or Retirar in edit mode, which reads the row itself. */
export type SavingDraft = { kind: "saving" | "withdrawal"; row: Movement };

export function canEdit(row: Movement) {
	return row.mine && row.kind !== "contribution";
}

export function editDraft(row: Movement): Draft | SavingDraft {
	if (row.kind === "saving" || row.kind === "withdrawal") return { kind: row.kind, row };
	return {
		kind: row.kind === "income" ? "income" : "expense",
		amount: (row.amountCents / 100).toFixed(2),
		id: row.id,
		note: row.note ?? "",
		envelope: row.envelope === "wants" ? "wants" : "needs",
	};
}
