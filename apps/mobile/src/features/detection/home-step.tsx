import { Linking, Pressable, Switch, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { useThemeColor } from "@/lib/use-theme-color";
import type { Bank, Reminder } from "../../../modules/quipu-detection";

export function HomeStep({
	banks,
	access,
	notifications,
	reminder,
	paused,
	onToggleReminder,
	onChooseBanks,
	onChangePaused,
	onClose,
}: {
	banks: Bank[];
	access: boolean;
	notifications: boolean;
	reminder: Reminder;
	/** Banks Plus no longer covers (K4d): they stay chosen but do not detect. */
	paused: string[];
	onToggleReminder: (enabled: boolean) => void;
	onChooseBanks: () => void;
	onChangePaused: () => void;
	onClose: () => void;
}) {
	const primary = useThemeColor("--color-primary");
	const pausedBanks = banks.filter((bank) => paused.includes(bank.packageName));
	const chosen = banks
		.filter((bank) => bank.chosen && !paused.includes(bank.packageName))
		.map((bank) => bank.name);
	const clock = `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;

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
					value={reminder.enabled}
					onValueChange={onToggleReminder}
					trackColor={{ true: primary }}
					accessibilityLabel="Recordatorio diario"
				/>
			</View>

			{notifications ? null : (
				<Pressable
					accessibilityRole="button"
					onPress={() => void Linking.openSettings()}
					className="mt-4"
				>
					<Text className="text-[15px] text-warning-foreground underline">
						Activa las notificaciones en Ajustes
					</Text>
				</Pressable>
			)}

			<Text className="mt-4 text-[15px] text-muted-foreground">
				{access && chosen.length > 0
					? `Quipu leerá ${chosen.join(", ")}.`
					: "Quipu prepara el gasto cuando tu banco te avisa."}
			</Text>

			{pausedBanks.length > 0 ? (
				<View className="mt-4">
					{pausedBanks.map((bank) => (
						<View
							key={bank.packageName}
							className="min-h-12 flex-row items-center justify-between gap-2 border-b border-border"
						>
							<View className="min-w-0 flex-1 py-2">
								<Text className="text-base text-foreground">{bank.name}</Text>
								<Text className="text-[13px] text-muted-foreground">No detectamos sus gastos</Text>
							</View>
							<Text className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
								Pausado
							</Text>
						</View>
					))}
					<View className="mt-3">
						<Button label="Cambiar mis 2 bancos" variant="secondary" onPress={onChangePaused} />
					</View>
				</View>
			) : null}

			<View className="mt-6">
				<Button label="Elegir bancos" onPress={onChooseBanks} />
			</View>
		</View>
	);
}
