import type { ReactNode } from "react";

/** Content that belongs to the previous space while the new one loads: dimmed, and nothing in it can be used. */
export function Stale({ active, children }: { active: boolean; children: ReactNode }) {
	return (
		<div inert={active} aria-busy={active} className={active ? "opacity-50" : undefined}>
			{children}
		</div>
	);
}
