import { Linking, Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import type { Bank } from "../../../modules/quipu-detection";

export function DetectionStatusStep({
	banks,
	access,
	notifications,
	paused,
	onChooseBanks,
	onChangePaused,
	onClose,
}: {
	banks: Bank[];
	access: boolean;
	notifications: boolean;
	paused: string[];
	onChooseBanks: () => void;
	onChangePaused: () => void;
	onClose: () => void;
}) {
	const pausedBanks = banks.filter((bank) => paused.includes(bank.packageName));
	const chosen = banks
		.filter((bank) => bank.chosen && !paused.includes(bank.packageName))
		.map((bank) => bank.name);

	return (
		<View>
			<View className="mb-2 flex-row items-center justify-between">
				<Text className="text-2xl font-semibold text-foreground">Detección de gastos</Text>
				<Pressable
					accessibilityRole="button"
					onPress={onClose}
					className="px-2 py-2 active:opacity-60"
				>
					<Text className="text-[15px] text-muted-foreground">Cerrar</Text>
				</Pressable>
			</View>

			{notifications ? null : (
				<Pressable
					accessibilityRole="button"
					onPress={() => void Linking.openSettings()}
					className="mt-4 active:opacity-60"
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
