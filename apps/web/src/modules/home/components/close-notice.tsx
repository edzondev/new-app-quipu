import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { closeNoticeText } from "@quipu/backend/shared/close-notice";
import { useMutation } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { X } from "lucide-react";
import { Button } from "#/components/ui/button";
import { readError } from "#/lib/read-error";

type ClosedNotice = NonNullable<FunctionReturnType<typeof api.cycles.getUnseenClosed>>;

export function CloseNotice({ closed }: { closed: ClosedNotice }) {
	const markSeen = useConvexMutation(api.cycles.markClosedSeen);
	const dismiss = useMutation({ mutationFn: () => markSeen({ cycleId: closed.cycleId }) });

	return (
		<div
			role="status"
			className="mb-6 flex items-start justify-between gap-3 rounded-2xl bg-muted py-1 pr-1 pl-4 text-sm"
		>
			<div className="min-w-0 py-2.5">
				<p className="wrap-break-word">{closeNoticeText(closed)}</p>
				{dismiss.isError ? (
					<p role="alert" className="mt-1.5 text-xs text-warning-foreground">
						{readError(dismiss.error)}
					</p>
				) : null}
			</div>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Cerrar aviso"
				className="size-11 shrink-0 sm:size-11"
				disabled={dismiss.isPending}
				onClick={() => dismiss.mutate()}
			>
				<X strokeWidth={1.5} />
			</Button>
		</div>
	);
}
