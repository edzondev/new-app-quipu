import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { closeNoticeText, householdCloseNoticeText } from "@quipu/backend/shared/close-notice";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { NoticeBar } from "./notice-bar";

type ClosedNotice = NonNullable<FunctionReturnType<typeof api.cycles.getUnseenClosed>>;

export function CloseNotice({
	closed,
	space,
}: {
	closed: ClosedNotice;
	space: "personal" | "household";
}) {
	const markSeen = useConvexMutation(api.cycles.markClosedSeen);
	const dismiss = useMutation({ mutationFn: () => markSeen({ cycleId: closed.cycleId }) });

	return (
		<NoticeBar onDismiss={() => dismiss.mutate()} pending={dismiss.isPending} error={dismiss.error}>
			<p className="wrap-break-word">
				{space === "household" ? householdCloseNoticeText(closed) : closeNoticeText(closed)}
			</p>
			{space === "personal" ? (
				<Link
					to="/progress"
					search={{ space: undefined }}
					className="flex min-h-11 items-center font-semibold underline underline-offset-4"
				>
					Ver en Progreso
				</Link>
			) : null}
		</NoticeBar>
	);
}
