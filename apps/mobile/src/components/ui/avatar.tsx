import { Text, View } from "react-native";

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
	return (
		<View
			className={`items-center justify-center rounded-full bg-muted ${large ? "size-[52px]" : "size-11"}`}
		>
			<Text className={`font-semibold text-foreground ${large ? "text-[21px]" : "text-[17px]"}`}>
				{name.charAt(0).toUpperCase()}
			</Text>
		</View>
	);
}
