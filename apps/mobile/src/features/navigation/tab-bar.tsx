import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/lib/use-theme-color";

const TAB_BAR_HEIGHT = 62;
const TAB_BAR_BOTTOM_GAP = 8;
const FAB_GAP_ABOVE_BAR = 14;
const FAB_PLUS_SIZE = 44;

/** Clears the floating pill and the FABs above it. Add `insets.bottom` separately. */
export const TAB_BAR_SPACE =
	TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT + FAB_GAP_ABOVE_BAR + FAB_PLUS_SIZE;

/** Bottom offset for FloatingActions (above the pill, below the safe area). */
export const FLOATING_ACTIONS_OFFSET = TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT + FAB_GAP_ABOVE_BAR;

export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
	const insets = useSafeAreaInsets();
	const primary = useThemeColor("--color-primary");
	const foreground = useThemeColor("--color-foreground");

	return (
		<View
			pointerEvents="box-none"
			className="absolute right-0 left-0"
			style={{ bottom: insets.bottom + TAB_BAR_BOTTOM_GAP }}
		>
			<View
				className="mx-3.5 h-[62px] flex-row items-center justify-between rounded-full bg-popover px-1"
				style={{
					shadowColor: foreground,
					shadowOffset: { width: 0, height: 10 },
					shadowOpacity: 0.12,
					shadowRadius: 14,
					elevation: 8,
				}}
			>
				{state.routes.map((route, index) => {
					const options = descriptors[route.key]?.options;
					if (!options) return null;

					const selected = state.index === index;
					const label = typeof options.title === "string" ? options.title : route.name;
					const color = selected ? primary : foreground;
					const icon = options.tabBarIcon?.({ focused: selected, color, size: 22 });

					return (
						<Pressable
							key={route.key}
							accessibilityRole="tab"
							accessibilityState={{ selected }}
							accessibilityLabel={label}
							onPress={() => {
								if (!selected) {
									navigateToTab(route.key);
								}
							}}
							className={`h-[54px] w-[68px] items-center justify-center rounded-full ${selected ? "bg-primary/10" : ""}`}
						>
							{icon}
							<Text
								className={`mt-0.5 text-[10px] font-semibold ${selected ? "text-primary" : "text-foreground"}`}
								numberOfLines={1}
							>
								{label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}
