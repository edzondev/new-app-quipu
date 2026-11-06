import type { Page } from "@playwright/test";

/**
 * Goes to `path` and waits until React has hydrated it. The pages are server-rendered: text typed
 * or a button clicked before hydration is lost. Hydrated controls carry React's `__reactProps$…`
 * key (an internal name, but the only exact signal; `networkidle` fires too early on a cold Vite).
 */
export async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForFunction(() =>
		[
			...document.querySelectorAll("header :is(a, button, input), main :is(a, button, input)"),
		].every((control) => Object.keys(control).some((key) => key.startsWith("__reactProps"))),
	);
}
