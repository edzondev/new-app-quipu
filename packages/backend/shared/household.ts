/** The code from what a person typed or pasted: a bare code, or a full invite link. */
export function extractCode(input: string): string {
	const [path = ""] = input.trim().split(/[?#]/);
	const last = path.split("/").filter(Boolean).at(-1) ?? "";
	return last.replace(/\s/g, "").toUpperCase();
}

const PROBE_ORIGIN = "https://quipu.invalid";

/**
 * Only internal paths, as they are. Browsers drop tabs and newlines and read a backslash as "/",
 * so "/<tab>/evil.com" would land on another host: any control character or backslash is
 * refused, and what is left must resolve to our own origin.
 */
export function safeRedirect(value: unknown): string {
	if (typeof value !== "string" || !value.startsWith("/")) return "/home";
	// oxlint-disable-next-line no-control-regex -- control characters are exactly what is refused
	if (/[\u0000-\u001f\u007f\\]/.test(value)) return "/home";
	return new URL(value, PROBE_ORIGIN).origin === PROBE_ORIGIN ? value : "/home";
}

/** "Luis Paz" → "Luis". The names shown and shared are first names only. */
export function firstName(name: string): string {
	return name.trim().split(/\s+/)[0] ?? "";
}

/** The first name of another person, or "Alguien" while they have not given one (an account that has not done onboarding yet). */
export function displayName(name: string): string {
	return firstName(name) || "Alguien";
}

export type ShareResult = "shared" | "cancelled" | "unavailable";

/**
 * Why navigator.share did not share. AbortError: the person closed the menu, nothing to say.
 * Anything else (blocked, not allowed): as if there were no menu, so the link is copied instead.
 */
export function shareFailure(error: unknown): Exclude<ShareResult, "shared"> {
	const name = typeof error === "object" && error !== null && "name" in error ? error.name : null;
	return name === "AbortError" ? "cancelled" : "unavailable";
}
