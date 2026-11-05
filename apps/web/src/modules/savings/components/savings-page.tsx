import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { FunctionArgs } from "convex/server";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import { ContributeDialog } from "./contribute-dialog";
import { FundCard } from "./fund-card";
import { FundGoalDialog } from "./fund-goal-dialog";
import type { Goal } from "./goal-card";
import { GoalFormDialog } from "./goal-form-dialog";
import { GoalsSection } from "./goals-section";
import { WithdrawDialog } from "./withdraw-dialog";

type Panel =
	| { kind: "contribute" | "withdraw" | "fundGoal" | "newGoal" }
	| { kind: "contributeGoal" | "editGoal"; id: Goal["id"] }
	| null;

export function SavingsPage() {
	const today = useLimaDate();
	const { space = "personal" } = useSearch({ from: "/_app" });
	// Remount when the Lima day or the space changes, so an open dialog never writes to the wrong one.
	return <Savings key={`${space}-${today}`} space={space} today={today} />;
}

function Savings({
	space,
	today,
}: {
	space: FunctionArgs<typeof api.goals.fund>["space"];
	today: string;
}) {
	const queryClient = useQueryClient();
	const [panel, setPanel] = useState<Panel>(null);
	const ensureOpen = useEnsureOpenCycle(space, today);
	const fund = useQuery(
		convexQuery(api.goals.fund, ensureOpen.isSuccess ? { space, today } : "skip"),
	);
	const balances = useQuery(
		convexQuery(api.balances.getBalances, ensureOpen.isSuccess ? { space } : "skip"),
	);
	const goals = useQuery(convexQuery(api.goals.list, ensureOpen.isSuccess ? { space } : "skip"));
	const close = () => setPanel(null);

	if (ensureOpen.isError || fund.isError || balances.isError || goals.isError) {
		return (
			<div role="alert" className="pt-6">
				<p className="text-sm text-warning-foreground">No pudimos cargar tus ahorros.</p>
				<Button
					variant="outline"
					className="mt-3"
					onClick={() => {
						void queryClient.invalidateQueries();
					}}
				>
					Reintentar
				</Button>
			</div>
		);
	}

	if (!fund.data || !balances.data || !goals.data) {
		return (
			<div role="status" className="space-y-6 pt-6" aria-busy="true" aria-label="Cargando">
				<Skeleton className="h-10 w-40" />
				<Skeleton className="h-3 w-80" />
				<Skeleton className="mt-8 h-44" />
			</div>
		);
	}

	const { savingsCents } = balances.data;
	const goal = panel && "id" in panel ? goals.data.find((item) => item.id === panel.id) : undefined;
	return (
		<>
			<header>
				<h1 className="font-heading text-4xl font-medium tracking-tight">Ahorros</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Lo que separas hoy cuida tu mes de mañana. No cuenta en lo que puedes gastar hoy.
				</p>
			</header>

			<FundCard
				fund={fund.data}
				onContribute={() => setPanel({ kind: "contribute" })}
				onWithdraw={() => setPanel({ kind: "withdraw" })}
				onEditGoal={() => setPanel({ kind: "fundGoal" })}
			/>

			<GoalsSection
				goals={goals.data}
				onNew={() => setPanel({ kind: "newGoal" })}
				onContribute={(id) => setPanel({ kind: "contributeGoal", id })}
				onEdit={(id) => setPanel({ kind: "editGoal", id })}
			/>

			<ContributeDialog
				open={panel?.kind === "contribute" || (panel?.kind === "contributeGoal" && !!goal)}
				space={space}
				savingsCents={savingsCents}
				savedCents={goal?.savedCents ?? fund.data.fundCents}
				targetCents={goal?.targetCents ?? fund.data.fundGoalCents}
				goal={goal}
				onClose={close}
			/>
			<GoalFormDialog
				open={panel?.kind === "newGoal" || (panel?.kind === "editGoal" && !!goal)}
				space={space}
				goal={goal}
				onClose={close}
			/>
			<WithdrawDialog
				open={panel?.kind === "withdraw"}
				space={space}
				fundCents={fund.data.fundCents}
				onClose={close}
			/>
			<FundGoalDialog
				open={panel?.kind === "fundGoal"}
				space={space}
				fundGoalCents={fund.data.fundGoalCents}
				suggestedCents={fund.data.suggestedFundGoalCents}
				onClose={close}
			/>
		</>
	);
}
