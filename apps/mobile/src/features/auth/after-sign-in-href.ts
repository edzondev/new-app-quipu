import type { Href } from "expo-router";
import { safeRedirect } from "@quipu/backend/shared/household";

// Same check as the web's ?redirect=. Its fallback "/home" is the web's Inicio; here Inicio is "/".
export function afterSignInHref(redirect: unknown): Href {
	const path = safeRedirect(redirect);
	return path === "/home" ? "/" : (path as Href);
}
