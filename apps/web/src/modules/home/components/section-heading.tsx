import { Link } from "@tanstack/react-router";

export function SectionHeading({
	title,
	to,
}: {
	title: string;
	to?: "/commitments" | "/movements";
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<h2 className="text-[13px] font-semibold">{title}</h2>
			{to ? (
				<Link
					to={to}
					className="flex min-h-11 items-center text-[13px] font-medium text-muted-foreground hover:text-foreground"
				>
					Ver todos
				</Link>
			) : null}
		</div>
	);
}
