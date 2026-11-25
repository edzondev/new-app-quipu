import { type Cadence, type CycleStartDay, parseStartDay } from "@quipu/backend/shared/plan";
import {
	getStartDayHelp,
	getStartDayOptions,
	getStartDayTitle,
} from "@quipu/backend/shared/start-day";
import { View } from "react-native";
import { OptionList } from "@/components/ui/option-list";
import { SheetHeader } from "@/components/ui/sheet-header";

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
	return (
		<View>
			<SheetHeader title={getStartDayTitle(cadence)} sub={getStartDayHelp(cadence)} />
			<View className="mt-1.5">
				<OptionList
					options={getStartDayOptions(cadence, String(value))}
					value={String(value)}
					onPick={(picked) => onPick(parseStartDay(picked))}
				/>
			</View>
		</View>
	);
}
