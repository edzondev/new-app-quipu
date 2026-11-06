import { useSyncExternalStore } from "react";

export const THEMES = [
	{ value: "system", label: "Sistema" },
	{ value: "light", label: "Claro" },
	{ value: "dark", label: "Oscuro" },
] as const;

export type Theme = (typeof THEMES)[number]["value"];

const STORAGE_KEY = "quipu-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Runs inline in <head>, before the first paint, so a saved "Oscuro" never flashes light.
 * It repeats `applyTheme` on purpose: it cannot import anything.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="dark"||(t!=="light"&&matchMedia("${DARK_QUERY}").matches))document.documentElement.classList.add("dark")}catch(e){}`;

function readTheme(): Theme {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		return saved === "light" || saved === "dark" ? saved : "system";
	} catch {
		return "system";
	}
}

function applyTheme(theme: Theme) {
	const dark = theme === "dark" || (theme === "system" && matchMedia(DARK_QUERY).matches);
	document.documentElement.classList.toggle("dark", dark);
}

const listeners = new Set<() => void>();

/**
 * Starts the circle in styles.css at the pointer, or in the middle of the screen when the change
 * came from the keyboard. The radius reaches the farthest corner.
 */
function setRevealOrigin(event: Event) {
	const fromPointer = event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0);
	const x = fromPointer ? event.clientX : innerWidth / 2;
	const y = fromPointer ? event.clientY : innerHeight / 2;
	const style = document.documentElement.style;
	style.setProperty("--theme-x", `${x}px`);
	style.setProperty("--theme-y", `${y}px`);
	style.setProperty(
		"--theme-r",
		`${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`,
	);
}

/** `event` is the choice that caused the change; it lets the new theme grow from where it was made. */
export function setTheme(theme: Theme, event?: Event) {
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// Storage can be blocked; the theme still applies until the page closes.
	}
	if (event && document.startViewTransition && !matchMedia(REDUCED_MOTION).matches) {
		setRevealOrigin(event);
		document.startViewTransition(() => applyTheme(theme));
	} else {
		applyTheme(theme);
	}
	for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
	listeners.add(onChange);
	// "Sistema" follows the device, and another tab can change the saved theme.
	const system = matchMedia(DARK_QUERY);
	const sync = () => {
		applyTheme(readTheme());
		onChange();
	};
	system.addEventListener("change", sync);
	window.addEventListener("storage", sync);
	return () => {
		listeners.delete(onChange);
		system.removeEventListener("change", sync);
		window.removeEventListener("storage", sync);
	};
}

export function useTheme() {
	return useSyncExternalStore(subscribe, readTheme, () => "system");
}
