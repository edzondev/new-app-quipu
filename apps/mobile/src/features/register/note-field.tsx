import { NOTE_MAX_LENGTH } from "@quipu/backend/shared/budget";
import { Text, View } from "react-native";
import { TextField } from "@/components/ui/text-field";

/** D1: «Concepto · opcional», always visible under the amount. */
export function NoteField({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
}) {
	return (
		<View className="mt-3">
			<Text className="text-[13px] text-muted-foreground">Concepto · opcional</Text>
			<TextField
				value={value}
				onChangeText={onChange}
				placeholder={placeholder}
				maxLength={NOTE_MAX_LENGTH}
				accessibilityLabel="Concepto"
			/>
		</View>
	);
}
