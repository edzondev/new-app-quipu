import { Tabs } from "expo-router";
import { TabBar } from "@/features/navigation/tab-bar";
import { FloatingActions } from "@/features/register/floating-actions";

export default function TabsLayout() {
	return (
		<>
			<Tabs
				tabBar={(props) => <TabBar {...props} />}
				screenOptions={{
					headerShown: false,
					animation: "none",
					tabBarStyle: {
						position: "absolute",
						backgroundColor: "transparent",
						borderTopWidth: 0,
						elevation: 0,
					},
				}}
			>
				<Tabs.Screen name="index" options={{ title: "Inicio" }} />
				<Tabs.Screen name="movements" options={{ title: "Movimientos" }} />
				<Tabs.Screen name="progress" options={{ title: "Progreso" }} />
				<Tabs.Screen name="savings" options={{ title: "Ahorros" }} />
				<Tabs.Screen name="commitments" options={{ title: "Compromisos" }} />
			</Tabs>
			<FloatingActions />
		</>
	);
}
