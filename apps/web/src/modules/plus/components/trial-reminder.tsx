import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { showTrialReminder, trialReminderMoments } from "@quipu/backend/shared/billing";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { useNow } from "#/hooks/use-now";
import { formatShortDate } from "#/lib/format-short-date";
import { NoticeBar } from "#/modules/home/components/notice-bar";
import { useOpenPlus } from "../plus-provider";

/** Once, in the last 2 days of the trial: it ends on its own and nothing is charged. */
export function TrialReminder() {
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const openPlus = useOpenPlus();
	const markSeen = useMutation({
		mutationFn: useConvexMutation(api.profiles.markTrialReminderSeen),
	});

	// The reminder shows from 48 h before the end and goes when the trial ends, with the page open.
	const trialEndsAt = profile.data?.trialEndsAt ?? null;
	const now = useNow(trialEndsAt === null ? [] : trialReminderMoments(trialEndsAt));

	if (!profile.data || !showTrialReminder(profile.data, now)) return null;
	return (
		<NoticeBar
			onDismiss={() => markSeen.mutate({})}
			pending={markSeen.isPending}
			error={markSeen.error}
		>
			<p>
				Tu prueba termina el {formatShortDate(profile.data.trialEndsAt)}. No se cobrará nada.{" "}
				<Button
					variant="link"
					className="h-auto min-h-11 px-0 align-baseline font-medium sm:h-auto"
					disabled={markSeen.isPending}
					onClick={() => {
						markSeen.mutate({});
						openPlus({});
					}}
				>
					Ver planes
				</Button>
			</p>
		</NoticeBar>
	);
}
