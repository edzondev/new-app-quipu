import type { Cadence, CycleStartDay } from "@quipu/backend/shared/plan";
import { Pressable, Text, View } from "react-native";
import { MONTH_DAYS, WEEK_CELLS } from "./days";

function DayCell({
	label,
	selected,
	onPress,
}: {
	label: string;
	selected: boolean;
	onPress: () => void;
}) {
	return (
		<View className="w-[14.28%] items-center">
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ selected }}
				onPress={onPress}
				className={`size-11 items-center justify-center rounded-full ${selected ? "bg-foreground" : ""}`}
			>
				<Text
					className={`text-[15px] ${selected ? "font-semibold text-background" : "text-foreground"}`}
				>
					{label}
				</Text>
			</Pressable>
		</View>
	);
}

export function DayGrid({
	cadence,
	value,
	onPick,
}: {
	cadence: Cadence;
	value: CycleStartDay;
	onPick: (day: CycleStartDay) => void;
}) {
	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">¿Qué día te pagan?</Text>
			<View className="mt-4 flex-row flex-wrap">
				{cadence === "weekly"
					? WEEK_CELLS.map((cell) => (
							<DayCell
								key={cell.value}
								label={cell.label}
								selected={value === cell.value}
								onPress={() => onPick(cell.value)}
							/>
						))
					: MONTH_DAYS.map((day) => (
							<DayCell
								key={day}
								label={String(day)}
								selected={value === day}
								onPress={() => onPick(day)}
							/>
						))}
			</View>
			{cadence === "weekly" ? null : (
				<>
					<Pressable
						accessibilityRole="button"
						accessibilityState={{ selected: value === "last" }}
						onPress={() => onPick("last")}
						className={`mt-2 min-h-11 items-center justify-center rounded-full ${value === "last" ? "bg-foreground" : "bg-secondary"}`}
					>
						<Text
							className={`text-[15px] font-semibold ${value === "last" ? "text-background" : "text-foreground"}`}
						>
							Último día del mes
						</Text>
					</Pressable>
					<Text className="mt-3 text-[13px] text-muted-foreground">
						Si cae en un mes más corto, usamos el último día.
					</Text>
				</>
			)}
		</View>
	);
}
