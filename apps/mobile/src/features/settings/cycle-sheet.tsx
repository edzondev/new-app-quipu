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
import { SheetHeader } from "@/components/ui/sheet-header";
import { CadenceChips } from "@/features/cycle/cadence-chips";
import { type Cycle, currentCycleText } from "@/features/cycle/cycle-days";
import { DayList } from "@/features/cycle/day-list";
import { DayRow } from "@/features/cycle/day-row";

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
				onClose={() => setPicking(false)}
			/>
		);
	}

	const next = { cadence, cycleStartDay: day };
	const unchanged = cadence === cycle.cadence && day === cycle.cycleStartDay;

	return (
		<View>
			<SheetHeader title="Tu ciclo" onClose={onClose} />
			<Text className="mt-1.5 text-sm leading-[21px] text-muted-foreground">
				Ahora: {currentCycleText(cycle)}.
			</Text>
			<View className="mt-4">
				<CadenceChips
					cadence={cadence}
					onChange={(picked) => {
						setCadence(picked);
						setDay(parseStartDay(DEFAULT_START_DAY[picked]));
					}}
				/>
			</View>
			<View className="mt-3">
				<DayRow
					label="Te pagan"
					value={getStartDayLabel(cadence, day)}
					accessibilityLabel={`Te pagan ${getStartDayLabel(cadence, day)}. Cambiar`}
					onPress={() => setPicking(true)}
				/>
			</View>
			<View className="mt-3.5 flex-row items-start gap-2.5 rounded-[18px] bg-muted px-3.5 py-3">
				<View className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
				<Text className="min-w-0 flex-1 text-[13px] leading-[19.5px] font-medium text-foreground">
					{describeCycleChange(next, currentEndDate)}
				</Text>
			</View>
			<View className="mt-[18px] mb-2">
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
