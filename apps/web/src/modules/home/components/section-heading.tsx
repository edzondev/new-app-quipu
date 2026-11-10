import { Link } from "@tanstack/react-router";
import { ACTION, EYEBROW } from "#/lib/typography";

export function SectionHeading({
	title,
	to,
}: {
	title: string;
	to?: "/commitments" | "/movements";
}) {
	return (
		<div className="flex min-h-[34px] items-center justify-between gap-3">
			<h2 className={EYEBROW}>{title}</h2>
			{to ? (
				<Link to={to} className={ACTION}>
					Ver todo
				</Link>
			) : null}
		</div>
	);
}
