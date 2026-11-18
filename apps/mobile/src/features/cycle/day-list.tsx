import { type Cadence, type CycleStartDay, parseStartDay } from "@quipu/backend/shared/plan";
import {
	getStartDayHelp,
	getStartDayOptions,
	getStartDayTitle,
} from "@quipu/backend/shared/start-day";
import { Pressable, ScrollView, Text, View } from "react-native";
import Check from "reicon-react-native/icons/Check";
import { SheetHeader } from "@/components/ui/sheet-header";
import { useThemeColor } from "@/lib/use-theme-color";

const ROW_HEIGHT = 48;
const MAX_LIST_HEIGHT = ROW_HEIGHT * 7.5;

/** One day to pick, in a list that scrolls inside the sheet. */
export function DayList({
	cadence,
	value,
	onPick,
	onClose,
}: {
	cadence: Cadence;
	value: CycleStartDay;
	onPick: (day: CycleStartDay) => void;
	onClose: () => void;
}) {
	const foreground = useThemeColor("--color-foreground");
	const options = getStartDayOptions(cadence, String(value));

	return (
		<View>
			<SheetHeader
				title={getStartDayTitle(cadence)}
				sub={getStartDayHelp(cadence)}
				onClose={onClose}
			/>
			<View className="mt-1.5">
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
								<Text
									className={`text-base text-foreground ${selected ? "font-bold" : "font-medium"}`}
								>
									{option.label}
								</Text>
								{selected ? <Check size={20} color={foreground} /> : null}
							</Pressable>
						);
					})}
				</ScrollView>
			</View>
		</View>
	);
}
