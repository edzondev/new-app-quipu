import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Plus from "reicon-react-native/icons/Plus";
import { FLOATING_ACTIONS_OFFSET } from "@/features/navigation/tab-bar";
import { useThemeColor } from "@/lib/use-theme-color";

const PLUS_SIZE = 44;

export function FloatingActions() {
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("--color-foreground");

	return (
		<View
			pointerEvents="box-none"
			className="absolute right-4"
			style={{ bottom: insets.bottom + FLOATING_ACTIONS_OFFSET }}
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Escribir gasto"
				onPress={() => router.push("/register")}
				className="items-center justify-center rounded-full bg-popover"
				style={{
					width: PLUS_SIZE,
					height: PLUS_SIZE,
					shadowColor: foreground,
					shadowOffset: { width: 0, height: 6 },
					shadowOpacity: 0.12,
					shadowRadius: 8,
					elevation: 4,
				}}
			>
				<Plus size={20} color={foreground} />
			</Pressable>
		</View>
	);
}
