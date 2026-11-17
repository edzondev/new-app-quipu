import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FREE_BANKS } from "@/features/plus/features";
import type { Bank } from "../../../modules/quipu-detection";

// The sheet unmounts its content when it closes: each opening starts from the banks kept so far.
function PickBanks({
	banks,
	kept,
	onSave,
	onPlans,
}: {
	banks: Bank[];
	kept: string[];
	onSave: (kept: string[]) => void;
	onPlans: () => void;
}) {
	const [picked, setPicked] = useState(kept);

	function toggle(packageName: string) {
		setPicked((current) =>
			current.includes(packageName)
				? current.filter((name) => name !== packageName)
				: [...current.slice(0, FREE_BANKS - 1), packageName],
		);
	}

	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">Elige tus 2 bancos</Text>
			<Text className="mt-2 text-sm text-muted-foreground">
				Sin Plus detectamos gastos de 2 bancos. El otro queda en pausa; no se borra nada.
			</Text>
			<View className="mt-3">
				{banks.map((bank) => {
					const selected = picked.includes(bank.packageName);
					return (
						<Pressable
							key={bank.packageName}
							accessibilityRole="checkbox"
							accessibilityState={{ checked: selected }}
							onPress={() => toggle(bank.packageName)}
							className="min-h-12 flex-row items-center border-b border-border"
						>
							<View className="flex-1 py-2">
								<Text className="text-base text-foreground">{bank.name}</Text>
								{selected ? null : (
									<Text className="text-[13px] text-muted-foreground">Quedará en pausa</Text>
								)}
							</View>
							{selected ? <Text className="text-primary">✓</Text> : null}
						</Pressable>
					);
				})}
			</View>
			<View className="mt-5 gap-2">
				<Button
					label="Guardar"
					disabled={picked.length !== FREE_BANKS}
					onPress={() => onSave(picked)}
				/>
				<Button label="Ver planes" variant="secondary" onPress={onPlans} />
			</View>
		</View>
	);
}

export function PickBanksSheet({
	isPresented,
	onDismiss,
	banks,
	kept,
	onSave,
	onPlans,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	banks: Bank[];
	kept: string[];
	onSave: (kept: string[]) => void;
	onPlans: () => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<PickBanks banks={banks} kept={kept} onSave={onSave} onPlans={onPlans} />
		</BottomSheet>
	);
}
