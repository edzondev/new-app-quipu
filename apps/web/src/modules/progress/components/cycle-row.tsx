import type { api } from "@quipu/backend/convex/_generated/api";
import { AMOUNT_KEYS, ENVELOPE_LABELS } from "@quipu/backend/shared/budget";
import { formatRangeWithYear } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { describeMargin, formatMoney } from "../progress-text";

type Cycle = FunctionReturnType<typeof api.progress.list>["cycles"][number];
type Detail = Extract<Cycle["detail"], { kind: "ok" }>;

const ENVELOPES = ["needs", "wants"] as const;
const rowLayout =
	"flex min-h-11 w-full flex-col items-start gap-1 py-3 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-x-4";

function Summary({
	cycle,
	together,
	children,
}: {
	cycle: Cycle;
	together: boolean;
	children?: ReactNode;
}) {
	const { text, tone } = describeMargin(cycle.marginCents, together);
	return (
		<>
			<span className="min-w-0 wrap-break-word font-semibold">
				{formatRangeWithYear(cycle.startDate, cycle.endDate)}
			</span>
			<span className={cn("flex items-center gap-2 text-sm tabular-nums", tone)}>
				{text}
				{children}
			</span>
		</>
	);
}

function Line({ label, cents }: { label: string; cents: number }) {
	return (
		<div className="flex flex-wrap justify-between gap-x-4">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="min-w-0 wrap-break-word tabular-nums">{formatMoney(cents)}</dd>
		</div>
	);
}

function Breakdown({
	left,
	detail,
	together,
}: {
	left: Cycle["left"];
	detail: Detail;
	together: boolean;
}) {
	return (
		<div className="space-y-4 pb-4">
			{ENVELOPES.map((envelope) => {
				const key = AMOUNT_KEYS[envelope];
				return (
					<section key={envelope}>
						<h4 className="flex items-center gap-2 text-sm font-semibold">
							<span aria-hidden className={cn("size-2 rounded-full", ENVELOPE_DOT[envelope])} />
							{ENVELOPE_LABELS[envelope]}
						</h4>
						<dl className="mt-1 space-y-0.5 text-sm">
							<Line label="Asignado" cents={detail.assigned[key]} />
							<Line label="Gastado" cents={detail.spent[key]} />
							<Line label="Sobrante" cents={left[key]} />
						</dl>
					</section>
				);
			})}
			{detail.fundedCents > 0 ? (
				<p className="text-sm">
					Ahorro: {formatMoney(detail.fundedCents)} pasó a {together ? "su Ahorro" : "tu fondo"}.
				</p>
			) : null}
		</div>
	);
}

export function CycleRow({
	cycle,
	together,
	defaultOpen,
}: {
	cycle: Cycle;
	together: boolean;
	defaultOpen: boolean;
}) {
	const { detail } = cycle;
	return (
		<li className="border-b border-border/60">
			{detail.kind === "ok" ? (
				<Collapsible defaultOpen={defaultOpen}>
					<h3>
						<CollapsibleTrigger className={cn(rowLayout, "group")}>
							<Summary cycle={cycle} together={together}>
								<ChevronDown
									aria-hidden
									className="size-4 shrink-0 transition-transform group-data-panel-open:rotate-180"
								/>
							</Summary>
						</CollapsibleTrigger>
					</h3>
					<CollapsiblePanel>
						<Breakdown left={cycle.left} detail={detail} together={together} />
					</CollapsiblePanel>
				</Collapsible>
			) : (
				<>
					<h3 className={rowLayout}>
						<Summary cycle={cycle} together={together} />
					</h3>
					<p className="-mt-1.5 pb-3 text-sm text-muted-foreground">
						Detalle no disponible para este ciclo
					</p>
				</>
			)}
		</li>
	);
}
