/** How full an envelope's bar is: what's left of what was assigned, from 0 to 100. */
export function envelopeFillPercent(leftCents: number, assignedCents: number) {
	if (assignedCents <= 0) return 0;
	return Math.min(100, Math.max(0, (leftCents / assignedCents) * 100));
}
