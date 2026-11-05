import { Button } from "#/components/ui/button";
import { ACTION, EYEBROW } from "#/lib/typography";
import { type Goal, GoalCard } from "./goal-card";

export function GoalsSection({
	goals,
	onNew,
	onContribute,
	onEdit,
}: {
	goals: Goal[];
	onNew: () => void;
	onContribute: (id: Goal["id"]) => void;
	onEdit: (id: Goal["id"]) => void;
}) {
	return (
		<section className="mt-10">
			<div className="flex min-h-[34px] items-center justify-between gap-3">
				<h2 className={EYEBROW}>Tus metas</h2>
				{goals.length > 0 ? (
					<button type="button" className={ACTION} onClick={onNew}>
						+ Nueva meta
					</button>
				) : null}
			</div>

			{goals.length === 0 ? (
				<div className="mt-3.5 rounded-3xl border-[1.5px] border-dashed border-input p-5">
					<p className="text-[15px] font-semibold">Crea tu primera meta</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Un viaje, una laptop, un curso. Cada meta junta su propio saldo.
					</p>
					<Button className="mt-3 rounded-full" onClick={onNew}>
						Crear meta
					</Button>
				</div>
			) : (
				<div className="mt-3.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{goals.map((goal) => (
						<GoalCard
							key={goal.id}
							goal={goal}
							onContribute={() => onContribute(goal.id)}
							onEdit={() => onEdit(goal.id)}
						/>
					))}
				</div>
			)}
		</section>
	);
}
