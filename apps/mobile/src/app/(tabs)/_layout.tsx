import { Tabs } from "expo-router";
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import Calendar from "reicon-react-native/icons/Calendar";
import ChartBar from "reicon-react-native/icons/ChartBar";
import Home from "reicon-react-native/icons/Home";
import List from "reicon-react-native/icons/List";
import ShieldCheck from "reicon-react-native/icons/ShieldCheck";
import { TabBar } from "@/features/navigation/tab-bar";
import { FloatingActions } from "@/features/register/floating-actions";

function tabIcon(Icon: ComponentType<{ size?: number; color?: string }>) {
	return ({ color, size }: { color: ColorValue; size: number }) => (
		<Icon size={size} color={typeof color === "string" ? color : undefined} />
	);
}

export default function TabsLayout() {
	return (
		<>
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
		</>
	);
}
