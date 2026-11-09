import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { cn } from "cn";
import type { FunctionReturnType } from "convex/server";
import { Button } from "#/components/ui/button";
import { ACTION, EYEBROW } from "#/lib/typography";
import { useReadOnlyGate } from "#/modules/household/use-read-only-gate";
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
	const { fundCents, fundGoalCents } = fund;
	const gate = useReadOnlyGate();
	const [whole, decimals] = formatCents(fundCents).split(".");
	const percent = fundGoalCents ? progressPercent(fundCents, fundGoalCents) : 0;

	const amount = (
		<p className="flex items-start gap-1 font-mono text-[clamp(44px,12vw,80px)] leading-none tracking-[-0.03em]">
			<span className="mt-2.5 text-2xl tracking-normal text-muted-foreground">S/</span>
			<span>{whole}</span>
			<span className="mt-2 text-[0.41em] text-muted-foreground">.{decimals}</span>
		</p>
	);

	return (
		<section className="mt-9 rounded-3xl bg-muted p-5 sm:p-9">
			{/* Below 640 px: title and edit link, amount with its bar, one line, two buttons. */}
			<div className="sm:hidden">
				<div className="flex min-h-11 items-center justify-between gap-4">
					<p className={EYEBROW}>Fondo de emergencia</p>
					{fundGoalCents ? (
						<button
							type="button"
							className="min-h-11 text-sm font-semibold underline underline-offset-4"
							onClick={onEditGoal}
							{...gate}
						>
							Editar meta
						</button>
					) : null}
				</div>
				<div className="mt-2">{amount}</div>
				{fundGoalCents ? (
					<>
						<div
							role="progressbar"
							aria-label="Avance de la meta del fondo"
							aria-valuenow={percent}
							aria-valuemin={0}
							aria-valuemax={100}
							className="mt-2 h-2 overflow-hidden rounded-full bg-background"
						>
							<div
								className="h-full rounded-full bg-envelope-savings"
								style={{ width: `${percent}%` }}
							/>
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							{percent}% de tu meta de S/ {formatCents(fundGoalCents)}
						</p>
					</>
				) : (
					<button type="button" className={cn(ACTION, "mt-4")} onClick={onEditGoal} {...gate}>
						Definir meta
					</button>
				)}
				<div className={cn("mt-6 grid gap-4", fundCents > 0 ? "grid-cols-2" : "grid-cols-1")}>
					<Button className="h-12 rounded-full" onClick={onContribute} {...gate}>
						Aportar
					</Button>
					{fundCents > 0 ? (
						<Button variant="outline" className="h-12 rounded-full" onClick={onWithdraw} {...gate}>
							Retirar
						</Button>
					) : null}
				</div>
			</div>

			<div className="hidden sm:block">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<p className={EYEBROW}>Fondo de emergencia</p>
						<div className="mt-2.5">{amount}</div>
						{fundGoalCents ? (
							<p className="mt-2.5 text-sm text-muted-foreground">
								Meta S/ {formatCents(fundGoalCents)} ·{" "}
								{percent >= 100 ? "Meta alcanzada" : `${percent}% de tu meta`}
								<button
									type="button"
									className={cn(ACTION, "ml-2.5 align-middle")}
									onClick={onEditGoal}
									{...gate}
								>
									Editar meta
								</button>
							</p>
						) : (
							<button type="button" className={cn(ACTION, "mt-2.5")} onClick={onEditGoal} {...gate}>
								Definir meta
							</button>
						)}
					</div>

					<div className="flex items-center gap-2.5">
						<Button className="h-11 rounded-full px-5" onClick={onContribute} {...gate}>
							Aportar
						</Button>
						{fundCents > 0 ? (
							<button type="button" className={ACTION} onClick={onWithdraw} {...gate}>
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
			</div>
		</section>
	);
}
