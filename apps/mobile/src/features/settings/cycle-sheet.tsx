import { type CycleStartDay, parseStartDay } from "@quipu/backend/shared/plan";
import {
	DEFAULT_START_DAY,
	describeCycleChange,
	getStartDayLabel,
} from "@quipu/backend/shared/start-day";
import { useState } from "react";
import { Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { CadenceChips } from "@/features/cycle/cadence-chips";
import { type Cycle, currentCycleText } from "@/features/cycle/cycle-days";
import { DayList } from "@/features/cycle/day-list";

// The sheet unmounts its content when it closes: each opening starts from the saved cycle.
function CycleForm({
	cycle,
	currentEndDate,
	onSave,
	onClose,
}: {
	cycle: Cycle;
	currentEndDate: string;
	onSave: (cycle: Cycle) => void;
	onClose: () => void;
}) {
	const [cadence, setCadence] = useState(cycle.cadence);
	const [day, setDay] = useState<CycleStartDay>(cycle.cycleStartDay);
	const [picking, setPicking] = useState(false);

	if (picking) {
		return (
			<DayList
				cadence={cadence}
				value={day}
				onPick={(picked) => {
					setDay(picked);
					setPicking(false);
				}}
			/>
		);
	}

	const next = { cadence, cycleStartDay: day };
	const unchanged = cadence === cycle.cadence && day === cycle.cycleStartDay;

	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">Tu ciclo</Text>
			<Text className="mt-1 text-sm text-muted-foreground">Ahora: {currentCycleText(cycle)}.</Text>
			<View className="mt-5">
				<CadenceChips
					cadence={cadence}
					onChange={(picked) => {
						setCadence(picked);
						setDay(parseStartDay(DEFAULT_START_DAY[picked]));
					}}
				/>
			</View>
			<View className="mt-2">
				<ListRow
					label="Te pagan"
					value={getStartDayLabel(cadence, day)}
					onPress={() => setPicking(true)}
				/>
			</View>
			<Text className="mt-3 text-[13px] text-muted-foreground">
				{describeCycleChange(next, currentEndDate)}
			</Text>
			<View className="mt-5">
				<Button
					label="Guardar"
					disabled={unchanged}
					onPress={() => {
						onSave(next);
						onClose();
					}}
				/>
			</View>
		</View>
	);
}

export function CycleSheet({
	isPresented,
	onDismiss,
	cycle,
	currentEndDate,
	onSave,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	cycle: Cycle;
	currentEndDate: string;
	onSave: (cycle: Cycle) => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<CycleForm
				cycle={cycle}
				currentEndDate={currentEndDate}
				onSave={onSave}
				onClose={onDismiss}
			/>
		</BottomSheet>
	);
}
