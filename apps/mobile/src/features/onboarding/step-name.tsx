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
			<Text className="text-4xl leading-10 font-semibold text-foreground">¿Cómo te llamas?</Text>
			<Text className="mt-6 mb-1 text-sm text-muted-foreground">Tu nombre</Text>
			<TextInput
				className={`min-h-11 border-b py-2 text-base text-foreground ${nameError ? "border-warning" : "border-input"}`}
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
