import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { cn } from "cn";
import type { FunctionReturnType } from "convex/server";
import { Button } from "#/components/ui/button";
import { ACTION, EYEBROW } from "#/lib/typography";
import { progressPercent } from "../progress";

type Fund = FunctionReturnType<typeof api.goals.fund>;

export function FundCard({
	fund,
	onContribute,
	onWithdraw,
	onEditGoal,
}: {
	fund: Fund;
	onContribute: () => void;
	onWithdraw: () => void;
	onEditGoal: () => void;
}) {
	const { fundCents, fundGoalCents, isOwner } = fund;
	const [whole, decimals] = formatCents(fundCents).split(".");
	const percent = fundGoalCents ? progressPercent(fundCents, fundGoalCents) : 0;

	return (
		<section className="mt-9 rounded-3xl bg-muted p-6 sm:p-9">
			<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<p className={EYEBROW}>Fondo de emergencia</p>
					<p className="mt-2.5 flex items-start gap-1 font-mono text-[clamp(44px,12vw,80px)] leading-none tracking-[-0.03em]">
						<span className="mt-2.5 text-2xl tracking-normal text-muted-foreground">S/</span>
						<span>{whole}</span>
						<span className="mt-2 text-[0.41em] text-muted-foreground">.{decimals}</span>
					</p>
					{fundGoalCents ? (
						<p className="mt-2.5 text-sm text-muted-foreground">
							Meta S/ {formatCents(fundGoalCents)} ·{" "}
							{percent >= 100 ? "Meta alcanzada" : `${percent}% de tu meta`}
							{isOwner ? (
								<button
									type="button"
									className={cn(ACTION, "ml-2.5 align-middle")}
									onClick={onEditGoal}
								>
									Editar meta
								</button>
							) : null}
						</p>
					) : isOwner ? (
						<button type="button" className={cn(ACTION, "mt-2.5")} onClick={onEditGoal}>
							Definir meta
						</button>
					) : null}
				</div>

				<div className="flex items-center gap-2.5">
					<Button className="h-11 rounded-full px-5" onClick={onContribute}>
						Aportar
					</Button>
					{fundCents > 0 ? (
						<button type="button" className={ACTION} onClick={onWithdraw}>
							Retirar
						</button>
					) : null}
				</div>
			</div>

			{fundGoalCents ? (
				<div className="mt-6 h-2.5 overflow-hidden rounded-full bg-background">
					<div
						className="h-full rounded-full bg-envelope-savings"
						style={{ width: `${percent}%` }}
					/>
				</div>
			) : null}
		</section>
	);
}
