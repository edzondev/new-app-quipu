import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { isOwnPurchase } from "@quipu/backend/shared/billing";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toastManager } from "#/components/ui/toast";
import { NoticeBar } from "#/modules/home/components/notice-bar";

const DROP_FLAG = {
	to: ".",
	search: (prev: Record<string, unknown>) => ({ ...prev, checkout: undefined }),
	replace: true,
} as const;

export function CheckoutReturn() {
	const { checkout } = useSearch({ from: "/_app" });
	const navigate = useNavigate();
	const status = useQuery(convexQuery(api.billing.status, checkout ? {} : "skip"));
	const confirmed = !!status.data && isOwnPurchase(status.data);
	const toasted = useRef(false);

	// The webhook lands on its own time: when a subscription of their own shows up, say so once and drop the flag.
	useEffect(() => {
		if (!checkout || !confirmed || toasted.current) return;
		toasted.current = true;
		toastManager.add({ title: "Quipu Plus activo.", type: "success" });
		void navigate(DROP_FLAG);
	}, [checkout, confirmed, navigate]);

	if (!checkout || confirmed) return null;
	return (
		<NoticeBar onDismiss={() => void navigate(DROP_FLAG)} pending={false} error={null}>
			<p>Estamos confirmando tu pago.</p>
		</NoticeBar>
	);
}
