import { TextInput, type TextInputProps } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

export function TextField({
	value,
	onChangeText,
	placeholder,
	maxLength,
	...rest
}: Pick<
	TextInputProps,
	"value" | "onChangeText" | "placeholder" | "maxLength" | "autoFocus" | "accessibilityLabel"
>) {
	const placeholderColor = useThemeColor("--color-muted-foreground");

	return (
		<TextInput
			value={value}
			onChangeText={onChangeText}
			placeholder={placeholder}
			maxLength={maxLength}
			placeholderTextColor={placeholderColor}
			className="border-b border-input py-2 text-base text-foreground"
			{...rest}
		/>
	);
}
