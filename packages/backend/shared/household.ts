/** The code from what a person typed or pasted: a bare code, or a full invite link. */
export function extractCode(input: string): string {
	const [path = ""] = input.trim().split(/[?#]/);
	const last = path.split("/").filter(Boolean).at(-1) ?? "";
	return last.replace(/\s/g, "").toUpperCase();
}

/** Only internal paths: "/x" passes, "//host" and "/\host" (read as "//host" by browsers) do not. */
export function safeRedirect(value: unknown): string {
	if (typeof value !== "string") return "/home";
	return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
		? value
		: "/home";
}

/** "Luis Paz" → "Luis". The names shown and shared are first names only. */
export function firstName(name: string): string {
	return name.trim().split(/\s+/)[0] ?? "";
}

/** The first name of another person, or "Alguien" while they have not given one (an account that has not done onboarding yet). */
export function displayName(name: string): string {
	return firstName(name) || "Alguien";
}
