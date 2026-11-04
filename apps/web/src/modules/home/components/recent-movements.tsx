import { formatRecentDay } from "@quipu/backend/shared/dates";
import { MovementRow } from "#/modules/movements/components/movement-row";
import type { Movement } from "#/modules/register/movement-draft";
import { SectionHeading } from "./section-heading";

const RECENT_COUNT = 5;

export function RecentMovements({ rows, today }: { rows: Movement[]; today: string }) {
	const recent = rows.slice(0, RECENT_COUNT);
	if (recent.length === 0) return null;

	return (
		<section className="mt-10">
			<SectionHeading title="Movimientos recientes" to="/movements" />
			<ul className="mt-1">
				{recent.map((row) => (
					<MovementRow key={row.id} row={row} when={formatRecentDay(row.date, today)} />
				))}
			</ul>
		</section>
	);
}
