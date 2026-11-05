import { toCents } from "@quipu/backend/shared/budget";
import * as z from "zod/mini";

export const positiveMoney = (message: string) =>
	z.string().check(z.refine((value) => toCents(value) > 0, message));
