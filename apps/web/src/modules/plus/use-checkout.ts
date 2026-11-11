import { convexQuery, useConvexAction } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { annualSavings, type Interval, planPrices } from "@quipu/backend/shared/billing";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useOpenUrl } from "./use-open-url";

export function useCheckout() {
	const offers = useQuery(convexQuery(api.billing.offer, {}));
	const [period, setPeriod] = useState<Interval>("year");
	const returnTo = useRouterState({ select: (state) => state.location.href });
	const startCheckout = useConvexAction(api.billing.startCheckout);
	const checkout = useOpenUrl(() => startCheckout({ interval: period, currency: "pen", returnTo }));

	const prices = planPrices(offers.data ?? []);
	const status = offers.isError ? "error" : offers.data ? "ready" : "loading";

	return {
		status,
		retry: () => void offers.refetch(),
		prices,
		savings: annualSavings(prices),
		period,
		setPeriod,
		opening: checkout.opening,
		failed: checkout.failed,
		canPay: status === "ready" && prices[period] !== null && !checkout.opening,
		start: checkout.start,
	};
}
