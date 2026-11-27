import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { PlusContent } from "@/features/plus/plus-sheet";
import { ContributeSheet } from "./contribute-sheet";
import { FundGoalSheet } from "./fund-goal-sheet";
import { GoalSheet } from "./goal-sheet";
import { WithdrawSheet } from "./withdraw-sheet";

type Fund = FunctionReturnType<typeof api.goals.fund>;
type Goal = FunctionReturnType<typeof api.goals.list>[number];

/** What the one sheet of Ahorros shows. `goalId: null` is the fund (contribute) or a new goal. */
export type SavingsPanel =
	| { kind: "contribute" | "goal"; goalId: Goal["id"] | null }
	| { kind: "withdraw" | "fundGoal" | "plus" };

/** The content of the sheet for `panel`. `goal` is the one the panel points to, read from the live list. */
export function SavingsSheet({
	space,
	today,
	panel,
	goal,
	fund,
	savingsCents,
	onDone,
	onTrial,
}: {
	space: "personal" | "household";
	today: string;
	panel: SavingsPanel;
	goal: Goal | null;
	fund: Fund;
	savingsCents: number;
	onDone: () => void;
	onTrial: (endsAt: number) => void;
}) {
	switch (panel.kind) {
		case "contribute":
			return (
				<ContributeSheet
					space={space}
					savingsCents={savingsCents}
					fund={fund}
					goal={goal}
					editing={null}
					onDone={onDone}
				/>
			);
		case "withdraw":
			return (
				<WithdrawSheet space={space} fundCents={fund.fundCents} editing={null} onDone={onDone} />
			);
		case "fundGoal":
			return (
				<FundGoalSheet
					space={space}
					fundGoalCents={fund.fundGoalCents}
					suggestedCents={fund.suggestedFundGoalCents}
					onDone={onDone}
				/>
			);
		case "goal":
			return (
				<GoalSheet space={space} goal={goal} today={today} onDone={onDone} onTrial={onTrial} />
			);
		case "plus":
			return <PlusContent feature="goals" onClose={onDone} onTrial={onTrial} />;
	}
}
