import { convexQuery, useConvexAction } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { annualSavings, type Interval, planPrices } from "@quipu/backend/shared/billing";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export function useCheckout() {
	const offers = useQuery(convexQuery(api.billing.offer, {}));
	const [period, setPeriod] = useState<Interval>("year");
	const returnTo = useRouterState({ select: (state) => state.location.href });
	const startCheckout = useConvexAction(api.billing.startCheckout);
	// `isPending` renders a tick late, so two quick clicks would both get through without this.
	const started = useRef(false);
	const checkout = useMutation({
		mutationFn: () => startCheckout({ interval: period, currency: "pen", returnTo }),
		onSuccess: ({ url }) => window.location.assign(url),
		onError: () => {
			started.current = false;
		},
	});
	const { reset } = checkout;

	// Back from Polar with the browser's back button, the page can come back from the bfcache as it was left.
	useEffect(() => {
		const onShow = (event: PageTransitionEvent) => {
			if (!event.persisted) return;
			started.current = false;
			reset();
		};
		window.addEventListener("pageshow", onShow);
		return () => window.removeEventListener("pageshow", onShow);
	}, [reset]);

	const prices = planPrices(offers.data ?? []);
	const status = offers.isError ? "error" : offers.data ? "ready" : "loading";
	const opening = checkout.isPending || checkout.isSuccess;

	return {
		status,
		retry: () => void offers.refetch(),
		prices,
		savings: annualSavings(prices),
		period,
		setPeriod,
		opening,
		failed: checkout.isError,
		canPay: status === "ready" && prices[period] !== null && !opening,
		start: () => {
			if (started.current) return;
			started.current = true;
			checkout.mutate();
		},
	};
}
