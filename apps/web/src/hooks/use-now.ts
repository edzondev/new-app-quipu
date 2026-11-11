import { delayUntil, nextMoment } from "@quipu/backend/shared/dates";
import { useEffect, useState } from "react";

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
		// Measured when scheduling, not from `now`, which may be old. A wait cut at the cap, or a timer
		// that fires early, leaves `next` ahead: `now` changed, so this runs again.
		const timer = next === null ? undefined : setTimeout(tick, delayUntil(next, Date.now()));
		return () => {
			document.removeEventListener("visibilitychange", onVisible);
			clearTimeout(timer);
		};
	}, [next, now]);

	return now;
}
