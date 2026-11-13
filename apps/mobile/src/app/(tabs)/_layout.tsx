import { NativeTabs } from "expo-router/native-tabs";
import { FloatingActions } from "@/features/register/floating-actions";

export default function TabsLayout() {
	return (
		<>
			<NativeTabs>
				<NativeTabs.Trigger name="index">
					<NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="movements">
					<NativeTabs.Trigger.Label>Movimientos</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="progress">
					<NativeTabs.Trigger.Label>Progreso</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="savings">
					<NativeTabs.Trigger.Label>Ahorros</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="commitments">
					<NativeTabs.Trigger.Label>Compromisos</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
			</NativeTabs>
			<FloatingActions />
		</>
	);
}
