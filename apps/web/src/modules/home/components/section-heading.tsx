import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ACTION, EYEBROW } from "#/lib/typography";

export function SectionHeading({
	title,
	to,
	action,
}: {
	title: string;
	to?: "/commitments" | "/movements";
	/** Any other action for the heading, such as a dialog trigger. */
	action?: ReactNode;
}) {
	return (
		<div className="flex min-h-[34px] items-center justify-between gap-3">
			<h2 className={EYEBROW}>{title}</h2>
			{to ? (
				<Link to={to} className={ACTION}>
					Ver todo
				</Link>
			) : (
				action
			)}
		</div>
	);
}
