import type { api } from "@quipu/backend/convex/_generated/api";
import { AMOUNT_KEYS, ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { cn } from "cn";
import type { FunctionReturnType } from "convex/server";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { SectionHeading } from "./section-heading";

type Home = FunctionReturnType<typeof api.balances.getHome>;

const ORDER = ["needs", "wants", "savings"] as const;

export function EnvelopeCards({ home }: { home: Home }) {
	return (
		<section>
			<SectionHeading title="Tus sobres" />
			<ul className="mt-2 grid gap-3 sm:grid-cols-3">
				{ORDER.map((envelope) => {
					const key = AMOUNT_KEYS[envelope];
					const cents = home[key];
					return (
						<li key={envelope} className="min-w-0 rounded-2xl border border-border/80 p-4">
							<p className="flex items-center gap-2 text-[13px] font-semibold">
								<span
									aria-hidden
									className={cn("size-2.5 shrink-0 rounded-full", ENVELOPE_DOT[envelope])}
								/>
								<span className="truncate">{ENVELOPE_LABELS[envelope]}</span>
								{envelope !== "savings" && cents === 0 ? (
									<span className="shrink-0 text-xs font-semibold text-warning-foreground">
										Agotado
									</span>
								) : null}
							</p>
							<p className="mt-2 font-mono text-xl font-semibold tabular-nums">
								S/ {formatCents(cents)}
							</p>
							{envelope === "savings" ? (
								<p className="mt-1 text-xs text-muted-foreground">
									Protegido · no suma a tu número
								</p>
							) : null}
							<p className="text-xs text-muted-foreground tabular-nums">
								de S/ {formatCents(home.assigned[key])}
							</p>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
