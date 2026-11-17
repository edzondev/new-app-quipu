import { useEffect, useState } from "react";

// One tick per second, cleared on unmount; the server enforces the real 90 s limit.
export function useResendClock(seconds: number) {
	const [left, setLeft] = useState(seconds);

	useEffect(() => {
		if (left <= 0) return;
		const timer = setTimeout(() => setLeft(left - 1), 1000);
		return () => clearTimeout(timer);
	}, [left]);

	return { left, restart: () => setLeft(seconds) };
}
