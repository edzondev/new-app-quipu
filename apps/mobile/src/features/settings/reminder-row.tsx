import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Linking, Pressable, Switch, Text, View } from "react-native";
import { ListRow } from "@/components/ui/list-row";
import { useThemeColor } from "@/lib/use-theme-color";
import { clockText, useReminder } from "./use-reminder";

/** Diario a las 23:30 por defecto. El selector de hora abre al tocar la fila. */
export function ReminderRow() {
	const primary = useThemeColor("--color-primary");
	const { reminder, denied, toggle, setTime } = useReminder();
	// The picker's starting time is built when it opens: a Date is not created while rendering.
	const [picking, setPicking] = useState<Date | null>(null);

	function openPicker() {
		const time = new Date();
		time.setHours(reminder.hour, reminder.minute, 0, 0);
		setPicking(time);
	}

	return (
		<View>
			<ListRow
				label="Recordatorio diario"
				sub={`A las ${clockText(reminder.hour, reminder.minute)}`}
				onPress={openPicker}
				right={
					<Switch
						value={reminder.enabled}
						onValueChange={(enabled) => void toggle(enabled)}
						trackColor={{ true: primary }}
						accessibilityLabel="Recordatorio diario"
					/>
				}
			/>
			{denied ? (
				<Pressable
					accessibilityRole="button"
					onPress={() => void Linking.openSettings()}
					className="min-h-11 justify-center"
				>
					<Text className="text-[13px] text-warning-foreground underline">
						Activa las notificaciones en Ajustes
					</Text>
				</Pressable>
			) : null}
			{picking ? (
				<DateTimePicker
					mode="time"
					is24Hour
					value={picking}
					accentColor={primary}
					onValueChange={(_, picked) => {
						setPicking(null);
						void setTime(picked.getHours(), picked.getMinutes());
					}}
					onDismiss={() => setPicking(null)}
				/>
			) : null}
		</View>
	);
}
