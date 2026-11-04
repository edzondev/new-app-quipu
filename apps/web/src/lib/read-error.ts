import { ConvexError } from "convex/values";

export function readError(error: unknown) {
	if (error instanceof ConvexError && typeof error.data === "string") return error.data;
	return "No pudimos guardarlo. Inténtalo otra vez.";
}
