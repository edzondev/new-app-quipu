import { Tabs } from "expo-router";
import Calendar from "reicon-react-native/icons/Calendar";
import ChartBar from "reicon-react-native/icons/ChartBar";
import Home from "reicon-react-native/icons/Home";
import List from "reicon-react-native/icons/List";
import ShieldCheck from "reicon-react-native/icons/ShieldCheck";
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
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						title: "Inicio",
						tabBarIcon: ({ color, size }) => (
							<Home size={size} color={typeof color === "string" ? color : undefined} />
						),
					}}
				/>
				<Tabs.Screen
					name="movements"
					options={{
						title: "Movimientos",
						tabBarIcon: ({ color, size }) => (
							<List size={size} color={typeof color === "string" ? color : undefined} />
						),
					}}
				/>
				<Tabs.Screen
					name="progress"
					options={{
						title: "Progreso",
						tabBarIcon: ({ color, size }) => (
							<ChartBar size={size} color={typeof color === "string" ? color : undefined} />
						),
					}}
				/>
				<Tabs.Screen
					name="savings"
					options={{
						title: "Ahorros",
						tabBarIcon: ({ color, size }) => (
							<ShieldCheck size={size} color={typeof color === "string" ? color : undefined} />
						),
					}}
				/>
				<Tabs.Screen
					name="commitments"
					options={{
						title: "Compromisos",
						tabBarIcon: ({ color, size }) => (
							<Calendar size={size} color={typeof color === "string" ? color : undefined} />
						),
					}}
				/>
			</Tabs>
			<FloatingActions />
		</>
	);
}
