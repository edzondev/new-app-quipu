import { ConvexError } from "convex/values";

/** The backend's message is already in Spanish and meant for the person: show it as it is. */
export function readError(error: unknown, fallback = "No pudimos guardarlo. Inténtalo otra vez.") {
	return error instanceof ConvexError && typeof error.data === "string" ? error.data : fallback;
}
