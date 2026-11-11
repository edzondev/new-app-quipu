import { addDays } from "./dates";

export const DELETION_DAYS = 15;

/** When a request made on `today` (a Lima date) runs: Lima midnight, 15 days later. Lima is UTC-5 all year. */
export function runsAtFor(today: string): number {
	return Date.parse(`${addDays(today, DELETION_DAYS)}T05:00:00Z`);
}
