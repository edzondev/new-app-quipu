import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { activityText, eventLine, groupEventsByDay } from "@quipu/backend/shared/activity";
import { formatDayHeading, formatLimaTime } from "@quipu/backend/shared/dates";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";

type ActivityEvent = FunctionReturnType<typeof api.activity.list>["events"][number];

function EventRow({ event }: { event: ActivityEvent }) {
	const line = eventLine(event);
	return (
		<li className="flex min-h-[60px] items-center justify-between gap-4 border-b border-border/60 py-2.5">
			<span className="flex min-w-0 items-center gap-3.5">
				<span
					aria-hidden
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
				>
					{event.who.charAt(0).toUpperCase()}
				</span>
				<span className="min-w-0">
					<span className="block truncate text-[15px] leading-[1.3] font-semibold">
						{activityText(event.type, event.mine, event.who)}
					</span>
					{line ? (
						<span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
							{line}
						</span>
					) : null}
				</span>
			</span>
			<span className="shrink-0 font-mono text-[12.5px] text-muted-foreground">
				{formatLimaTime(event.at)}
			</span>
		</li>
	);
}

/** One page of the household activity. "Ver más" mounts the next page from the `next` cursor. */
export function ActivityPage({ today, before }: { today: string; before?: number }) {
	const [showNext, setShowNext] = useState(false);
	const page = useQuery(convexQuery(api.activity.list, { before }));

	if (page.isError) {
		return (
			<p role="alert" className="pt-4 text-sm text-warning-foreground">
				No pudimos cargar la actividad. Recarga la página.
			</p>
		);
	}
	if (!page.data) {
		return (
			<div role="status" aria-busy="true" aria-label="Cargando" className="mt-4 space-y-4">
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
			</div>
		);
	}

	const { events, next } = page.data;
	if (events.length === 0 && before === undefined) {
		return (
			<p className="mt-10 text-sm text-muted-foreground">
				Aún no hay cambios. La actividad aparecerá aquí.
			</p>
		);
	}
	return (
		<>
			<div className="mt-8 space-y-8">
				{groupEventsByDay(events).map((group) => (
					<section key={group.date}>
						<h2 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
							{formatDayHeading(group.date, today)}
						</h2>
						<ul className="mt-1">
							{group.events.map((event) => (
								<EventRow key={event.id} event={event} />
							))}
						</ul>
					</section>
				))}
			</div>
			{next === null ? null : showNext ? (
				<ActivityPage today={today} before={next} />
			) : (
				<Button
					type="button"
					variant="outline"
					className="mt-4 min-h-11"
					onClick={() => setShowNext(true)}
				>
					Ver más
				</Button>
			)}
		</>
	);
}
