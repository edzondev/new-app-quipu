import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Row } from "@/features/movements/movement-rows";
import { ContributeSheet } from "./contribute-sheet";
import { WithdrawSheet } from "./withdraw-sheet";

type Fund = FunctionReturnType<typeof api.goals.fund>;
type Goal = FunctionReturnType<typeof api.goals.list>[number];

/** A row of Movimientos opens Aportar or Retirar in edit mode. The destination shows and does not change. */
export function EditSavingSheet({
	space,
	row,
	fund,
	goals,
	savingsCents,
	onDone,
}: {
	space: "personal" | "household";
	row: Row;
	fund: Fund;
	goals: Goal[];
	savingsCents: number;
	onDone: () => void;
}) {
	if (row.kind === "withdrawal") {
		return <WithdrawSheet space={space} fundCents={fund.fundCents} editing={row} onDone={onDone} />;
	}
	// A deleted goal leaves its savings in the fund, so the row has no goal anymore.
	const goal = goals.find((item) => item.id === row.goalId) ?? null;
	return (
		<ContributeSheet
			space={space}
			savingsCents={savingsCents}
			fund={fund}
			goal={goal}
			editing={row}
			onDone={onDone}
		/>
	);
}
