import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * W-U7: shows for 3 seconds after joining, then takes `?joined` out of the address. It lives above
 * Inicio's loading states so a skeleton swap cannot hide it or restart its timer.
 */
export function JoinedNotice() {
	const { joined } = useSearch({ from: "/_app/home" });
	const household = useQuery(convexQuery(api.household.get, joined ? {} : "skip"));
	const router = useRouter();
	const partnerName = household.data?.partnerName;
	const visible = joined === true && !!partnerName;

	useEffect(() => {
		if (!visible) return;
		const id = setTimeout(() => {
			void router.navigate({
				to: "/home",
				search: (prev) => ({ ...prev, joined: undefined }),
				replace: true,
			});
		}, 3000);
		return () => clearTimeout(id);
	}, [visible, router]);

	if (!visible) return null;
	return (
		<p role="status" className="mb-4 rounded-2xl bg-muted px-4 py-3 text-sm">
			Ya estás en Nuestro espacio con {partnerName}.
		</p>
	);
}
