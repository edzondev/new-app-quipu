import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useLimaDate } from "#/hooks/use-lima-date";
import type { Movement } from "#/modules/register/movement-draft";
import { ContributeForm } from "./contribute-dialog";
import { WithdrawForm } from "./withdraw-dialog";

/** Aportar or Retirar in edit mode for a row of Movimientos. The destination shows and does not change. */
export function EditSavingForm({ row, onDone }: { row: Movement; onDone: () => void }) {
	const { space = "personal" } = useSearch({ from: "/_app" });
	const today = useLimaDate();
	const fund = useQuery(convexQuery(api.goals.fund, { space, today })).data;
	const balances = useQuery(convexQuery(api.balances.getBalances, { space })).data;
	const goals = useQuery(convexQuery(api.goals.list, { space })).data;
	if (!fund || !balances || !goals) return null;

	if (row.kind === "withdrawal") {
		return <WithdrawForm space={space} fundCents={fund.fundCents} editing={row} onClose={onDone} />;
	}
	const goal = goals.find((item) => item.id === row.goalId);
	return (
		<ContributeForm
			space={space}
			savingsCents={balances.savingsCents}
			savedCents={goal?.savedCents ?? fund.fundCents}
			targetCents={goal?.targetCents ?? fund.fundGoalCents}
			goal={goal}
			editing={row}
			onClose={onDone}
		/>
	);
}
