import { formatCents } from "@quipu/backend/shared/budget";
import { Pressable, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { useThemeColor } from "@/lib/use-theme-color";
import { FIXED_SHORTCUTS, type FixedItem } from "./plan";

function FixedRow({
	item,
	onChange,
	onRemove,
}: {
	item: FixedItem;
	onChange: (patch: Partial<Omit<FixedItem, "id">>) => void;
	onRemove: () => void;
}) {
	const muted = useThemeColor("--color-muted-foreground");

	return (
		<View className="min-h-16 flex-row items-center justify-between gap-3 border-b border-border py-2">
			<View className="min-w-0 flex-1">
				<Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
					{item.name}
				</Text>
				<View className="flex-row items-center">
					<Text className="text-[13px] text-muted-foreground">Día</Text>
					<TextInput
						className="min-h-11 min-w-8 px-1 py-2 text-center font-mono text-[13px] text-foreground"
						keyboardType="number-pad"
						maxLength={2}
						value={item.dayText}
						onChangeText={(text) => onChange({ dayText: text.replace(/\D/g, "") })}
						placeholderTextColor={muted}
						accessibilityLabel={`Día de ${item.name}`}
					/>
					<Text className="text-[13px] text-muted-foreground">· </Text>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Quitar ${item.name}`}
						onPress={onRemove}
						className="min-h-11 justify-center"
					>
						<Text className="text-[13px] text-muted-foreground underline">Quitar</Text>
					</Pressable>
				</View>
			</View>
			<TextInput
				className="w-28 text-right font-mono text-base text-foreground"
				keyboardType="decimal-pad"
				placeholder="0.00"
				placeholderTextColor={muted}
				value={item.amountText}
				onChangeText={(text) => onChange({ amountText: text.replace(/[^\d.,]/g, "") })}
				accessibilityLabel={`Monto de ${item.name}`}
			/>
		</View>
	);
}

export function FixedSheet({
	isPresented,
	onDismiss,
	items,
	dailyCents,
	onAdd,
	onChange,
	onRemove,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	items: FixedItem[];
	dailyCents: number;
	onAdd: (name: string) => void;
	onChange: (id: string, patch: Partial<Omit<FixedItem, "id">>) => void;
	onRemove: (id: string) => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<Text className="text-3xl font-semibold text-foreground">Lo que pagas cada mes</Text>
			<View className="mt-4">
				<Chips
					options={FIXED_SHORTCUTS}
					selectedIndex={-1}
					onChange={(index) => onAdd(FIXED_SHORTCUTS[index])}
				/>
			</View>
			<View className="mt-2">
				{items.map((item) => (
					<FixedRow
						key={item.id}
						item={item}
						onChange={(patch) => onChange(item.id, patch)}
						onRemove={() => onRemove(item.id)}
					/>
				))}
			</View>
			{items.length > 0 ? (
				<Text className="mt-3 text-[13px] text-muted-foreground">
					Se reservan antes de repartir. Tu número de hoy pasa a S/ {formatCents(dailyCents)}.
				</Text>
			) : null}
			<View className="mt-5">
				<Button label="Listo" onPress={onDismiss} />
			</View>
		</BottomSheet>
	);
}
