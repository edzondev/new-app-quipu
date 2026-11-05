const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function progressPercent(savedCents: number, targetCents: number) {
	return Math.min(100, Math.floor((savedCents / targetCents) * 100));
}

/** "2027-03" → "Mar 2027". The backend only stores months 01-12. */
export function formatTargetMonth(month: string) {
	const [year, number] = month.split("-");
	return `${MONTHS[Number(number) - 1]} ${year}`;
}
