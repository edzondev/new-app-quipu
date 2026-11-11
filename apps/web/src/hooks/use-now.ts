import { nextMoment } from "@quipu/backend/shared/dates";
import { useEffect, useState } from "react";

// setTimeout fires at once past this delay (about 24 days): wait in steps that size instead.
const MAX_DELAY_MS = 2 ** 31 - 1;

/**
 * The clock for a screen that compares with it: it moves at each of `moments` and when the tab
 * comes back into view (a sleeping tab may have missed one). One timer at a time, no polling.
 */
export function useNow(moments: readonly number[]) {
	const [now, setNow] = useState(Date.now);
	const next = nextMoment(moments, now);

	useEffect(() => {
		const tick = () => setNow(Date.now());
		const onVisible = () => {
			if (document.visibilityState === "visible") tick();
		};
		document.addEventListener("visibilitychange", onVisible);
		// A timer that fires a little early leaves `next` ahead: `now` changed, so this runs again.
		const timer =
			next === null ? undefined : setTimeout(tick, Math.min(next - now, MAX_DELAY_MS) + 50);
		return () => {
			document.removeEventListener("visibilitychange", onVisible);
			clearTimeout(timer);
		};
	}, [next, now]);

	return now;
}
