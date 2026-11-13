import { TextInput, type TextInputProps } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

export function TextField(props: TextInputProps) {
	const placeholderColor = useThemeColor("--color-muted-foreground");

	return (
		<TextInput
			{...props}
			placeholderTextColor={placeholderColor}
			className="border-b border-input py-2 text-base text-foreground"
		/>
	);
}
