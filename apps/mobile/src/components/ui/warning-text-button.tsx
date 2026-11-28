import { Pressable, Text } from "react-native";
import Trash from "reicon-react-native/icons/Trash";
import { useThemeColor } from "@/lib/use-theme-color";

/** Amber text button with a bin: deletes or takes something out. Never red, never underlined. */
export function WarningTextButton({ label, onPress }: { label: string; onPress: () => void }) {
	const warning = useThemeColor("--color-warning-foreground");

	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			className="mt-3.5 min-h-12 flex-row items-center justify-center gap-1.5 self-center px-3 active:opacity-60 ios:min-h-11"
		>
			<Trash size={16} color={warning} />
			<Text className="text-[13.5px] font-semibold text-warning-foreground">{label}</Text>
		</Pressable>
	);
}
