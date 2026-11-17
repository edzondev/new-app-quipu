import { addDays, getLimaDate } from "@quipu/backend/shared/dates";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

// Timers do not run in the background, so the day is also read again when the app comes back.
// shortcut: Lima is UTC-5 with no DST; revisit if Peru ever adopts it.
export function useLimaDate() {
	const [today, setToday] = useState(() => getLimaDate());

	useEffect(() => {
		const sync = () => setToday(getLimaDate());
		const midnight = Date.parse(`${addDays(today, 1)}T05:00:00Z`);
		const timer = setTimeout(sync, Math.max(0, midnight - Date.now()) + 50);
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") sync();
		});
		return () => {
			clearTimeout(timer);
			subscription.remove();
		};
	}, [today]);

	return today;
}
