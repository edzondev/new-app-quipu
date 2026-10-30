import { addDays, getLimaDate } from "@quipu/backend/shared/dates";
import { useEffect, useState } from "react";

// shortcut: Lima is UTC-5 with no DST; revisit if Peru ever adopts it.
export function useLimaDate() {
	const [today, setToday] = useState(() => getLimaDate());

	useEffect(() => {
		const midnight = Date.parse(`${addDays(today, 1)}T05:00:00Z`);
		const timer = setTimeout(
			() => setToday(getLimaDate()),
			Math.max(0, midnight - Date.now()) + 50,
		);
		return () => clearTimeout(timer);
	}, [today]);

	return today;
}
