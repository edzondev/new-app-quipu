import type { ReactNode } from "react";
import { EYEBROW } from "#/lib/typography";

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="mt-10">
			<h2 className={EYEBROW}>{title}</h2>
			<ul className="mt-2 border-t border-border/80">{children}</ul>
		</section>
	);
}

export function SettingsRow({
	title,
	action,
	children,
}: {
	title: string;
	action: ReactNode;
	children?: ReactNode;
}) {
	return (
		<li className="flex min-h-[72px] items-center justify-between gap-4 border-b border-border/80 py-4">
			<div className="min-w-0">
				<p className="wrap-break-word text-[15px] font-semibold">{title}</p>
				{children ? (
					<div className="mt-1 space-y-0.5 text-sm text-muted-foreground">{children}</div>
				) : null}
			</div>
			{action}
		</li>
	);
}
