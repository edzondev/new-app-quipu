import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Plus from "reicon-react-native/icons/Plus";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useSpace } from "@/features/household/space-context";
import { FLOATING_ACTIONS_OFFSET } from "@/features/navigation/tab-bar";
import { useThemeColor } from "@/lib/use-theme-color";

const PLUS_SIZE = 44;

export function FloatingActions() {
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("--color-foreground");
	const { readOnly } = useSpace();

	return (
		<View
			pointerEvents="box-none"
			className="absolute right-4"
			style={{ bottom: insets.bottom + FLOATING_ACTIONS_OFFSET }}
		>
			<PressableScale
				accessibilityRole="button"
				accessibilityLabel="Escribir gasto"
				accessibilityState={{ disabled: readOnly }}
				disabled={readOnly}
				onPress={() => router.push("/register")}
				className={`items-center justify-center rounded-full bg-popover ${readOnly ? "opacity-40" : ""}`}
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
			</PressableScale>
		</View>
	);
}
