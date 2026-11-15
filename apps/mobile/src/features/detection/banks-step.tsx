import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import type { Bank } from "../../../modules/quipu-detection";

export function BanksStep({
	banks,
	selected,
	onToggle,
	onContinue,
	onBack,
}: {
	banks: Bank[];
	selected: string[];
	onToggle: (packageName: string) => void;
	onContinue: () => void;
	onBack: () => void;
}) {
	const installed = banks.filter((bank) => bank.installed);
	const missing = banks.filter((bank) => !bank.installed);

	return (
		<View>
			<Text className="text-2xl font-semibold text-foreground">Elige tus bancos</Text>
			{installed.length > 0 ? (
				<Section title="En tu teléfono">
					{installed.map((bank) => (
						<Row
							key={bank.packageName}
							bank={bank}
							selected={selected.includes(bank.packageName)}
							onPress={() => onToggle(bank.packageName)}
						/>
					))}
				</Section>
			) : null}
			{missing.length > 0 ? (
				<Section title="Otros">
					{missing.map((bank) => (
						<Row key={bank.packageName} bank={bank} selected={false} />
					))}
				</Section>
			) : null}
			<View className="mt-6 gap-3">
				<Button
					label={`Continuar (${selected.length})`}
					disabled={selected.length === 0}
					onPress={onContinue}
				/>
				<Button label="Atrás" variant="secondary" onPress={onBack} />
			</View>
		</View>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View className="mt-5">
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				{title}
			</Text>
			<View className="mt-1">{children}</View>
		</View>
	);
}

function Row({ bank, selected, onPress }: { bank: Bank; selected: boolean; onPress?: () => void }) {
	const installed = bank.installed;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected, disabled: !installed }}
			disabled={!installed}
			onPress={onPress}
			className="min-h-12 flex-row items-center border-b border-border"
		>
			<View className="flex-1 py-2">
				<Text
					className={installed ? "text-base text-foreground" : "text-base text-muted-foreground"}
				>
					{bank.name}
				</Text>
				{installed ? null : <Text className="text-[13px] text-muted-foreground">No instalado</Text>}
			</View>
			{selected ? <Text className="text-primary">✓</Text> : null}
		</Pressable>
	);
}
