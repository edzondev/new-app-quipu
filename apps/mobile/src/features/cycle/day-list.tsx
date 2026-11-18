import { type Cadence, type CycleStartDay, parseStartDay } from "@quipu/backend/shared/plan";
import {
	getStartDayHelp,
	getStartDayOptions,
	getStartDayTitle,
} from "@quipu/backend/shared/start-day";
import { Pressable, ScrollView, Text, View } from "react-native";
import Check from "reicon-react-native/icons/Check";
import { useThemeColor } from "@/lib/use-theme-color";

const ROW_HEIGHT = 48;
const MAX_LIST_HEIGHT = ROW_HEIGHT * 7.5;

/** One day to pick, in a list that scrolls inside the sheet. */
export function DayList({
	cadence,
	value,
	onPick,
}: {
	cadence: Cadence;
	value: CycleStartDay;
	onPick: (day: CycleStartDay) => void;
}) {
	const foreground = useThemeColor("--color-foreground");
	const options = getStartDayOptions(cadence, String(value));
	const help = getStartDayHelp(cadence);

	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">{getStartDayTitle(cadence)}</Text>
			{help ? <Text className="mt-1 text-[13px] text-muted-foreground">{help}</Text> : null}
			<View className="mt-3">
				<ScrollView style={{ height: Math.min(options.length * ROW_HEIGHT, MAX_LIST_HEIGHT) }}>
					{options.map((option) => {
						const selected = option.value === String(value);
						return (
							<Pressable
								key={option.value}
								accessibilityRole="button"
								accessibilityState={{ selected }}
								onPress={() => onPick(parseStartDay(option.value))}
								className="min-h-12 flex-row items-center justify-between border-b border-border"
							>
								<Text className={`text-[15px] text-foreground ${selected ? "font-semibold" : ""}`}>
									{option.label}
								</Text>
								{selected ? <Check size={18} color={foreground} /> : null}
							</Pressable>
						);
					})}
				</ScrollView>
			</View>
		</View>
	);
}
