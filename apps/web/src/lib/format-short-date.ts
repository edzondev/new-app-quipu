import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";

/** A moment as its day in Lima, like "24 nov". */
export function formatShortDate(at: number) {
	return formatDay(getLimaDate(new Date(at)));
}
