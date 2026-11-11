import { NEED_PLUS } from "@quipu/backend/shared/billing";
import { ConvexError } from "convex/values";

export const needsPlus = (error: unknown) =>
	error instanceof ConvexError && error.data === NEED_PLUS;
