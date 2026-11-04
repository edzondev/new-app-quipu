import { groupCommitments, type CommitmentItem } from "#/modules/commitments/commitment-view";
import { CommitmentRow } from "#/modules/commitments/components/commitment-row";
import { SectionHeading } from "./section-heading";

const UPCOMING_COUNT = 3;

export function UpcomingCommitments({
	items,
	today,
	space,
}: {
	items: CommitmentItem[];
	today: string;
	space: "personal" | "household";
}) {
	const upcoming = groupCommitments(items).pending.slice(0, UPCOMING_COUNT);

	return (
		<section>
			<SectionHeading title="Próximos compromisos" to="/commitments" />
			{upcoming.length === 0 ? (
				<p className="mt-3 text-sm text-muted-foreground">Todo está cubierto este ciclo.</p>
			) : (
				<ul>
					{upcoming.map((item) => (
						<CommitmentRow key={item.id} item={item} today={today} space={space} />
					))}
				</ul>
			)}
		</section>
	);
}
