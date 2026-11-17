import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

/** True once today's personal cycle exists; the queries that need it wait for this. Runs again when the Lima day changes. */
export function useOpenCycle(today: string, enabled: boolean) {
	const ensureOpen = useMutation(api.cycles.ensureOpen);
	const [openedOn, setOpenedOn] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		ensureOpen({ space: "personal" }).then(
			() => {
				if (!cancelled) setOpenedOn(today);
			},
			// Luego: P3 (error al cargar, con Reintentar). Hasta entonces las queries siguen saltadas.
			() => {},
		);
		return () => {
			cancelled = true;
		};
	}, [enabled, ensureOpen, today]);

	return enabled && openedOn === today;
}
