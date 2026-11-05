import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { cn } from "cn";
import type { FunctionReturnType } from "convex/server";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { ACTION } from "#/lib/typography";
import { formatTargetMonth, progressPercent } from "../progress";

export type Goal = FunctionReturnType<typeof api.goals.list>[number];

export function GoalCard({
	goal,
	onContribute,
	onEdit,
}: {
	goal: Goal;
	onContribute: () => void;
	onEdit: () => void;
}) {
	const percent = progressPercent(goal.savedCents, goal.targetCents);
	const reached = goal.savedCents >= goal.targetCents;

	return (
		<article className="min-w-0 rounded-3xl bg-muted p-6">
			<div className="flex items-center justify-between gap-3">
				<h3 className="flex min-w-0 items-center gap-2.5 text-base font-semibold">
					<span aria-hidden className={cn("size-2 shrink-0 rounded-full", ENVELOPE_DOT.savings)} />
					<span className="truncate">{goal.name}</span>
				</h3>
				{goal.targetMonth ? (
					<span className="shrink-0 text-[13px] text-muted-foreground">
						{formatTargetMonth(goal.targetMonth)}
					</span>
				) : null}
			</div>
			<p className="mt-2.5 truncate font-mono text-3xl tracking-tight tabular-nums">
				S/ {formatCents(goal.savedCents)}
			</p>
			<p className="text-[13px] text-muted-foreground tabular-nums">
				de S/ {formatCents(goal.targetCents)} · {reached ? "Meta alcanzada" : `${percent}%`}
			</p>
			<div className="mt-3 h-[5px] overflow-hidden rounded-full bg-background">
				<div className="h-full rounded-full bg-envelope-savings" style={{ width: `${percent}%` }} />
			</div>
			<div className="mt-3.5 flex flex-wrap items-center gap-2">
				{reached ? (
					<span className="inline-flex h-[34px] items-center rounded-full bg-background px-3.5 text-[13px] font-semibold text-muted-foreground">
						Lista
					</span>
				) : (
					<button type="button" className={ACTION} onClick={onContribute}>
						+ Aportar
					</button>
				)}
				<button type="button" className={ACTION} onClick={onEdit}>
					Editar meta
				</button>
			</div>
		</article>
	);
}
