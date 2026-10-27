import { useEffect, useRef, useState } from "react";

export function useCountdown(durationMs = 90_000) {
	const endsAt = useRef(0);
	const [secondsLeft, setSecondsLeft] = useState(0);
	const isRunning = secondsLeft > 0;

	useEffect(() => {
		if (!isRunning) return;
		const id = setInterval(() => {
			setSecondsLeft(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000)));
		}, 1000);
		return () => clearInterval(id);
	}, [isRunning]);

	function start() {
		endsAt.current = Date.now() + durationMs;
		setSecondsLeft(Math.ceil(durationMs / 1000));
	}

	return { secondsLeft, start };
}
