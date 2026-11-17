import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import AngleLeft from "reicon-react-native/icons/AngleLeft";
import { useThemeColor } from "@/lib/use-theme-color";

export function ScreenHeader({ title }: { title: string }) {
	const foreground = useThemeColor("--color-foreground");

	return (
		<View className="-mx-2.5 min-h-11 flex-row items-center justify-between">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Volver"
				onPress={() => router.back()}
				className="size-11 items-center justify-center"
			>
				<AngleLeft size={22} color={foreground} />
			</Pressable>
			<Text className="text-[15px] font-semibold text-foreground">{title}</Text>
			<View className="w-11" />
		</View>
	);
}
