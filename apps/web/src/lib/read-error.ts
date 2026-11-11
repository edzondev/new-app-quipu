import { ConvexError } from "convex/values";

export function readError(error: unknown, fallback = "No pudimos guardarlo. Inténtalo otra vez.") {
	if (error instanceof ConvexError && typeof error.data === "string") return error.data;
	return fallback;
}
