/** `null`: the code does not exist. `expiresAt` is 0 once the invite was used. */
export function inviteState(
	info: { expiresAt: number } | null,
	now: number,
): "missing" | "unusable" | "valid" {
	if (!info) return "missing";
	return info.expiresAt > now ? "valid" : "unusable";
}
