import { useCSSVariable } from "uniwind";

/** Resolves a theme CSS variable. Updates when the theme changes. */
export function useThemeColor(name: `--${string}`): string {
	const value = useCSSVariable(name);
	return typeof value === "string" ? value : "";
}
