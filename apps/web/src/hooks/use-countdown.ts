import { useEffect, useState } from "react";

// Starts on mount: the screen that uses it appears right after a code is sent.
export function useCountdown(durationMs = 90_000) {
	const [endsAt, setEndsAt] = useState(() => Date.now() + durationMs);
	const [now, setNow] = useState(() => Date.now());
	const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));
	const isRunning = secondsLeft > 0;

	useEffect(() => {
		if (!isRunning) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [isRunning]);

	function restart() {
		const start = Date.now();
		setEndsAt(start + durationMs);
		setNow(start);
	}

	return { secondsLeft, restart };
}
