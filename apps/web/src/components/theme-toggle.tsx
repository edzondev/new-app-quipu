import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { setTheme } from "#/lib/theme";

export function ThemeToggle() {
	return (
		<Button
			variant="ghost"
			size="icon-xl"
			aria-label="Cambiar tema"
			className="rounded-full"
			onClick={(event) =>
				setTheme(
					document.documentElement.classList.contains("dark") ? "light" : "dark",
					event.nativeEvent,
				)
			}
		>
			<MoonIcon className="dark:hidden" />
			<SunIcon className="hidden dark:inline" />
		</Button>
	);
}
