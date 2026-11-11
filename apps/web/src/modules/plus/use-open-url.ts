import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/** Asks the server for a Polar URL and goes there: one call at a time, and the button stays off until the page leaves. */
export function useOpenUrl(getUrl: () => Promise<{ url: string }>) {
	// `isPending` renders a tick late, so two quick clicks would both get through without this.
	const started = useRef(false);
	const mutation = useMutation({
		mutationFn: getUrl,
		onSuccess: ({ url }) => window.location.assign(url),
		onError: () => {
			started.current = false;
		},
	});
	const { reset } = mutation;

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

	return {
		opening: mutation.isPending || mutation.isSuccess,
		failed: mutation.isError,
		start: () => {
			if (started.current) return;
			started.current = true;
			mutation.mutate();
		},
	};
}
