import { keepPreviousData } from "@tanstack/react-query";

/**
 * For a query that depends on the space: when the space changes, the old data stays on screen
 * (see `Stale`) until the new data arrives, so only the first load shows a skeleton.
 */
export function spaceQuery<Options extends object>(options: Options) {
	return { ...options, placeholderData: keepPreviousData };
}
