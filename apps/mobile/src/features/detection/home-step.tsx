import { Pressable, Switch, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { useThemeColor } from "@/lib/use-theme-color";
import type { Bank } from "../../../modules/quipu-detection";

export function HomeStep({
	banks,
	access,
	reminderOn,
	hour,
	minute,
	onToggleReminder,
	onChooseBanks,
	onClose,
}: {
	banks: Bank[];
	access: boolean;
	reminderOn: boolean;
	hour: number;
	minute: number;
	onToggleReminder: (enabled: boolean) => void;
	onChooseBanks: () => void;
	onClose: () => void;
}) {
	const primary = useThemeColor("--color-primary");
	const chosen = banks.filter((bank) => bank.chosen).map((bank) => bank.name);
	const clock = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

	return (
		<View>
			<View className="flex-row items-center justify-between">
				<Text className="text-2xl font-semibold text-foreground">Detección de gastos</Text>
				<Pressable accessibilityRole="button" onPress={onClose} className="px-2 py-2">
					<Text className="text-[15px] text-muted-foreground">Cerrar</Text>
				</Pressable>
			</View>

			<View className="mt-6 min-h-12 flex-row items-center border-b border-border">
				<View className="flex-1">
					<Text className="text-base text-foreground">Recordatorio diario</Text>
					<Text className="text-[13px] text-muted-foreground">A las {clock}</Text>
				</View>
				<Switch
					value={reminderOn}
					onValueChange={onToggleReminder}
					trackColor={{ true: primary }}
					accessibilityLabel="Recordatorio diario"
				/>
			</View>

			<Text className="mt-4 text-[15px] text-muted-foreground">
				{access && chosen.length > 0
					? `Quipu leerá ${chosen.join(", ")}.`
					: "Quipu prepara el gasto cuando tu banco te avisa."}
			</Text>

			<View className="mt-6">
				<Button label="Elegir bancos" onPress={onChooseBanks} />
			</View>
		</View>
	);
}
