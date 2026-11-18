import { NAME_MAX } from "@quipu/backend/shared/name";
import { Text, TextInput, View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

export function StepName({
	name,
	nameError,
	onName,
}: {
	name: string;
	nameError: string | null;
	onName: (text: string) => void;
}) {
	const muted = useThemeColor("--color-muted-foreground");

	return (
		<View>
			<Text className="text-4xl leading-[40px] font-semibold text-foreground">
				¿Cómo te llamas?
			</Text>
			<Text className="mt-7 text-[13.5px] font-medium text-muted-foreground">Tu nombre</Text>
			<TextInput
				className={`mt-1 border-b-[1.5px] px-0 pt-2 pb-2.5 text-[28px] font-medium text-foreground ${nameError ? "border-warning" : "border-foreground"}`}
				placeholder="Tu nombre"
				placeholderTextColor={muted}
				autoCapitalize="words"
				autoComplete="given-name"
				textContentType="givenName"
				maxLength={NAME_MAX}
				value={name}
				onChangeText={onName}
				accessibilityLabel="Tu nombre"
			/>
			{nameError ? (
				<Text accessibilityRole="alert" className="mt-1.5 text-[13px] text-warning-foreground">
					{nameError}
				</Text>
			) : null}
		</View>
	);
}
