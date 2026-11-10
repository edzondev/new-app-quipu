import type { api } from "@quipu/backend/convex/_generated/api";
import { AMOUNT_KEYS, ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { cn } from "cn";
import type { FunctionReturnType } from "convex/server";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { SectionHeading } from "./section-heading";

type Home = FunctionReturnType<typeof api.balances.getHome>;

const ORDER = ["needs", "wants", "savings"] as const;
const SAVINGS_NOTE = "No suma a tu número";

function fillPercent(cents: number, assignedCents: number) {
	if (assignedCents <= 0) return 0;
	return Math.min(100, Math.max(0, Math.round((cents / assignedCents) * 100)));
}

const LOCK = (
	<span
		role="img"
		title={SAVINGS_NOTE}
		aria-label={SAVINGS_NOTE}
		className="inline-flex items-center text-muted-foreground"
	>
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="5" y="11" width="14" height="10" rx="2.5" />
			<path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
		</svg>
	</span>
);

export function EnvelopeCards({ home }: { home: Home }) {
	return (
		<section>
			<SectionHeading title="Tus sobres" />
			<ul>
				{ORDER.map((envelope) => {
					const key = AMOUNT_KEYS[envelope];
					const cents = home[key];
					const assignedCents = home.assigned[key];
					const over = cents < 0;
					return (
						<li key={envelope} className="border-b border-border/80 py-3.5">
							<div className="flex items-baseline justify-between gap-3">
								<span className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold">
									<span
										aria-hidden
										className={cn("size-2 shrink-0 rounded-full", ENVELOPE_DOT[envelope])}
									/>
									<span className="truncate">{ENVELOPE_LABELS[envelope]}</span>
									{envelope === "savings" ? LOCK : null}
								</span>
								<span className="shrink-0 font-mono text-[15px]">
									S/ {formatCents(Math.max(0, cents))}{" "}
									<span className="text-[13px] text-muted-foreground">
										de S/ {formatCents(assignedCents)}
									</span>
								</span>
							</div>
							<div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-muted">
								<div
									className={cn(
										"h-full rounded-full",
										over ? "bg-warning" : ENVELOPE_DOT[envelope],
									)}
									style={{ width: `${over ? 100 : fillPercent(cents, assignedCents)}%` }}
								/>
							</div>
							{over ? (
								<p className="mt-1.5 text-[12.5px] font-medium text-warning-foreground">
									Te pasaste por S/ {formatCents(-cents)}
								</p>
							) : null}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
