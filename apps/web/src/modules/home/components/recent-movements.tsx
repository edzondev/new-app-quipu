import { formatRecentDay } from "@quipu/backend/shared/dates";
import { MovementRow } from "#/modules/movements/components/movement-row";
import type { Movement } from "#/modules/register/movement-draft";
import { SectionHeading } from "./section-heading";

/** Inicio asks the server for only these. */
export const RECENT_COUNT = 5;

export function RecentMovements({ rows, today }: { rows: Movement[]; today: string }) {
	if (rows.length === 0) return null;

	return (
		<section>
			<SectionHeading title="Movimientos recientes" to="/movements" />
			<ul>
				{rows.map((row) => (
					<MovementRow key={row.id} row={row} when={formatRecentDay(row.date, today)} />
				))}
			</ul>
		</section>
	);
}
