import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

type Settled = { day: string; failed: false } | { day: string; failed: true; error: unknown };

/**
 * True once today's personal cycle exists; the queries that need it wait for this. Runs again when the Lima day changes.
 * A failed opening throws during render, so the nearest error boundary shows the retry.
 */
export function useOpenCycle(today: string) {
	const ensureOpen = useMutation(api.cycles.ensureOpen);
	const [settled, setSettled] = useState<Settled | null>(null);

	useEffect(() => {
		let cancelled = false;
		ensureOpen({ space: "personal" }).then(
			() => {
				if (!cancelled) setSettled({ day: today, failed: false });
			},
			(error: unknown) => {
				if (!cancelled) setSettled({ day: today, failed: true, error });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [ensureOpen, today]);

	if (settled?.day !== today) return false;
	if (settled.failed) throw settled.error;
	return true;
}
