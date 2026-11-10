const url = import.meta.env.VITE_SITE_URL || (import.meta.env.DEV ? "http://localhost:3000" : "");
if (!url) throw new Error("Falta VITE_SITE_URL");
export const SITE_URL = new URL(url).origin;
export const INDEXABLE = import.meta.env.MODE === "production";
export const SITE_TITLE = "Quipu · Sabe cuánto puedes gastar hoy";
export const SITE_DESCRIPTION =
	"Anotas lo que entra y lo que sale, Quipu lo reparte en sobres y te dice tu número de cada día. En soles, sin conectar tu banco.";
export const THEME_COLOR = "#faf7f1";
