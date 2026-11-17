import { Uniwind, useUniwind } from "uniwind";
import { Segmented } from "@/components/ui/segmented";

const MODES = ["system", "light", "dark"] as const;

export function Appearance() {
	const { theme, hasAdaptiveThemes } = useUniwind();
	const selected = hasAdaptiveThemes ? 0 : theme === "dark" ? 2 : 1;

	return (
		<Segmented
			options={["Sistema", "Claro", "Oscuro"]}
			selectedIndex={selected}
			onChange={(index) => Uniwind.setTheme(MODES[index])}
		/>
	);
}
