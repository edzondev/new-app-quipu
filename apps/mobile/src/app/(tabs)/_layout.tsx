import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { Redirect, router, Tabs } from "expo-router";
import type { ComponentType } from "react";
import { type ColorValue, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Calendar from "reicon-react-native/icons/Calendar";
import ChartBar from "reicon-react-native/icons/ChartBar";
import Home from "reicon-react-native/icons/Home";
import List from "reicon-react-native/icons/List";
import Plus from "reicon-react-native/icons/Plus";
import ShieldCheck from "reicon-react-native/icons/ShieldCheck";
import { PressableScale } from "@/components/ui/pressable-scale";
import { HomeLoading } from "@/features/home/home-skeleton";
import { SpaceProvider, useSpace } from "@/features/household/space-context";
import { FLOATING_ACTIONS_OFFSET, TabBar } from "@/features/navigation/tab-bar";
import { useThemeColor } from "@/lib/use-theme-color";

const PLUS_SIZE = 44;

function FloatingActions() {
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

function tabIcon(Icon: ComponentType<{ size?: number; color?: string }>) {
	return ({ color, size }: { color: ColorValue; size: number }) => (
		<Icon size={size} color={typeof color === "string" ? color : undefined} />
	);
}

export default function TabsLayout() {
	const { data: profile } = useQuery(convexQuery(api.profiles.myProfile, {}));

	if (profile === undefined) return <HomeLoading />;
	// Same rules as apps/web/src/routes/_app.tsx, minus deletionRunsAt (no mobile screen for it yet).
	if (profile === null || (!profile.plan && !profile.hasHousehold)) {
		return <Redirect href="/onboarding" />;
	}

	return (
		<SpaceProvider>
			<Tabs
				tabBar={(props) => <TabBar {...props} />}
				screenOptions={{
					headerShown: false,
					animation: "none",
				}}
			>
				<Tabs.Screen name="index" options={{ title: "Inicio", tabBarIcon: tabIcon(Home) }} />
				<Tabs.Screen
					name="movements"
					options={{ title: "Movimientos", tabBarIcon: tabIcon(List) }}
				/>
				<Tabs.Screen
					name="progress"
					options={{ title: "Progreso", tabBarIcon: tabIcon(ChartBar) }}
				/>
				<Tabs.Screen
					name="savings"
					options={{ title: "Ahorros", tabBarIcon: tabIcon(ShieldCheck) }}
				/>
				<Tabs.Screen
					name="commitments"
					options={{ title: "Compromisos", tabBarIcon: tabIcon(Calendar) }}
				/>
			</Tabs>
			<FloatingActions />
		</SpaceProvider>
	);
}
