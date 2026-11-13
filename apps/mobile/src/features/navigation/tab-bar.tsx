import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Calendar from "reicon-react-native/icons/Calendar";
import ChartBar from "reicon-react-native/icons/ChartBar";
import Home from "reicon-react-native/icons/Home";
import List from "reicon-react-native/icons/List";
import ShieldCheck from "reicon-react-native/icons/ShieldCheck";
import { useCSSVariable } from "uniwind";

const TAB_BAR_HEIGHT = 62;
const TAB_BAR_BOTTOM_GAP = 8;
const FAB_GAP_ABOVE_BAR = 14;
export const FAB_MIC_SIZE = 60;

/** Clears the floating pill and the FABs above it. Add `insets.bottom` separately. */
export const TAB_BAR_SPACE = TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT + FAB_GAP_ABOVE_BAR + FAB_MIC_SIZE;

/** Bottom offset for FloatingActions (above the pill, below the safe area). */
export const FLOATING_ACTIONS_OFFSET = TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT + FAB_GAP_ABOVE_BAR;

const ICONS = {
	index: Home,
	movements: List,
	progress: ChartBar,
	savings: ShieldCheck,
	commitments: Calendar,
} as const;

const LABELS = {
	index: "Inicio",
	movements: "Movimientos",
	progress: "Progreso",
	savings: "Ahorros",
	commitments: "Compromisos",
} as const;

type TabName = keyof typeof ICONS;

function cssColor(value: string | number | undefined, fallback: string): string {
	return typeof value === "string" ? value : fallback;
}

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
	const insets = useSafeAreaInsets();
	const primary = cssColor(useCSSVariable("--color-primary"), "#B54D26");
	const foreground = cssColor(useCSSVariable("--color-foreground"), "#1D1610");

	return (
		<View
			pointerEvents="box-none"
			className="absolute right-0 left-0"
			style={{ bottom: insets.bottom + TAB_BAR_BOTTOM_GAP }}
		>
			<View
				className="mx-3.5 h-[62px] flex-row items-center justify-between rounded-full bg-card px-1"
				style={{
					shadowColor: "#1D1610",
					shadowOffset: { width: 0, height: 10 },
					shadowOpacity: 0.12,
					shadowRadius: 14,
					elevation: 8,
				}}
			>
				{state.routes.map((route, index) => {
					const name = route.name as TabName;
					const selected = state.index === index;
					const Icon = ICONS[name];
					const label = LABELS[name];
					const color = selected ? primary : foreground;

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
							{Icon ? <Icon size={22} color={color} /> : null}
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
