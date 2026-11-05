import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { Button } from "#/components/ui/button";
import { EYEBROW } from "#/lib/typography";

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
	const percent = fundGoalCents ? Math.min(100, Math.floor((fundCents / fundGoalCents) * 100)) : 0;

	return (
		<section className="mt-9 max-w-xl rounded-2xl border border-border p-6">
			<p className={EYEBROW}>Fondo de emergencia</p>
			<p className="mt-2.5 flex flex-wrap items-start gap-1 font-mono text-5xl leading-none tracking-[-0.03em] break-all">
				<span className="mt-1.5 text-xl tracking-normal text-muted-foreground">S/</span>
				<span>{whole}</span>
				<span className="mt-1 text-[0.41em] text-muted-foreground">.{decimals}</span>
			</p>

			{fundGoalCents ? (
				<div className="mt-4">
					<div className="flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
						<span>Meta S/ {formatCents(fundGoalCents)}</span>
						{isOwner ? (
							<Button variant="link" size="sm" onClick={onEditGoal}>
								Editar meta
							</Button>
						) : null}
					</div>
					<div className="mt-1 h-[5px] overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-envelope-savings"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<p className="mt-1.5 text-sm text-muted-foreground">
						{percent >= 100 ? "Meta alcanzada" : `${percent}% de tu meta`}
					</p>
				</div>
			) : isOwner ? (
				<Button variant="link" size="sm" className="mt-3 px-0" onClick={onEditGoal}>
					Definir meta
				</Button>
			) : null}

			<div className="mt-6 flex flex-wrap gap-2">
				<Button className="h-11 rounded-full px-6" onClick={onContribute}>
					Aportar
				</Button>
				{fundCents > 0 ? (
					<Button variant="outline" className="h-11 rounded-full px-6" onClick={onWithdraw}>
						Retirar
					</Button>
				) : null}
			</div>
		</section>
	);
}
