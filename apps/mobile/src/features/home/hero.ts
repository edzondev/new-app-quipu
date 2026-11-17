import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";

type HomeHeroInput = Pick<
	FunctionReturnType<typeof api.balances.getHome>,
	"overCents" | "spentTodayCents" | "leftCents" | "dailyCents"
>;

export function amountParts(cents: number) {
	const [whole, decimals] = formatCents(cents).split(".");
	return { whole, decimals: decimals ?? "00" };
}

/** Same rule as the web home page: over → left today → daily. */
export function homeHero({ overCents, spentTodayCents, leftCents, dailyCents }: HomeHeroInput) {
	const over = overCents > 0;
	const spent = spentTodayCents > 0;
	const cents = over ? overCents : spent ? leftCents : dailyCents;
	const { whole, decimals } = amountParts(cents);
	const label = over ? "Hoy te pasaste" : spent ? "Te queda hoy" : "Puedes gastar hoy";
	return { whole, decimals, label, over };
}
