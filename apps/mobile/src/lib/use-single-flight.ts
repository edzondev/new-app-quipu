import { useRef } from "react";

/**
 * Runs `mutateAsync` and resolves to whether it worked; why it did not stays in the mutation's `error`.
 * A second call while one is running is dropped: `isPending` alone lets two quick taps through before it paints.
 */
export function useSingleFlight<T>(mutateAsync: (value: T) => Promise<unknown>) {
	const running = useRef(false);

	return async (value: T): Promise<boolean> => {
		if (running.current) return false;
		running.current = true;
		try {
			await mutateAsync(value);
			return true;
		} catch {
			return false;
		} finally {
			running.current = false;
		}
	};
}
