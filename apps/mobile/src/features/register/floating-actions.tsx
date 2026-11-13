import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Mic from "reicon-react-native/icons/Mic";
import Plus from "reicon-react-native/icons/Plus";
import { useCSSVariable } from "uniwind";
import { FAB_MIC_SIZE, FLOATING_ACTIONS_OFFSET } from "@/features/navigation/tab-bar";

const PLUS_SIZE = 44;

function cssColor(value: string | number | undefined, fallback: string): string {
	return typeof value === "string" ? value : fallback;
}

export function FloatingActions() {
	const insets = useSafeAreaInsets();
	const foreground = cssColor(useCSSVariable("--color-foreground"), "#1D1610");
	const onPrimary = cssColor(useCSSVariable("--color-primary-foreground"), "#FBF8F3");

	return (
		<View
			pointerEvents="box-none"
			className="absolute right-4 flex-row items-center gap-3"
			style={{ bottom: insets.bottom + FLOATING_ACTIONS_OFFSET }}
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Escribir gasto"
				onPress={() => router.push("/register")}
				className="items-center justify-center rounded-full bg-card"
				style={{
					width: PLUS_SIZE,
					height: PLUS_SIZE,
					shadowColor: "#281C12",
					shadowOffset: { width: 0, height: 6 },
					shadowOpacity: 0.12,
					shadowRadius: 8,
					elevation: 4,
				}}
			>
				<Plus size={20} color={foreground} />
			</Pressable>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Registrar gasto con tu voz"
				onPress={() => {}}
				className="items-center justify-center rounded-full bg-primary"
				style={{
					width: FAB_MIC_SIZE,
					height: FAB_MIC_SIZE,
					shadowColor: "#B54D26",
					shadowOffset: { width: 0, height: 14 },
					shadowOpacity: 0.34,
					shadowRadius: 15,
					elevation: 6,
				}}
			>
				<Mic size={30} color={onPrimary} />
			</Pressable>
		</View>
	);
}
