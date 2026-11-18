import { formatDay, formatDayHeading } from "@quipu/backend/shared/dates";
import { useState } from "react";
import { SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chips } from "@/components/ui/chips";
import { SAMPLE_TODAY } from "@/features/home/sample";
import { MovementRow } from "@/features/movements/movement-row";
import {
	dayTotalCents,
	FILTERS,
	filterRows,
	groupByDay,
	signedAmount,
} from "@/features/movements/movement-rows";
import { SAMPLE_MOVEMENTS } from "@/features/movements/sample";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { SAMPLE_GOALS } from "@/features/savings/sample";

function Title() {
	return <Text className="text-3xl font-semibold text-foreground">Movimientos</Text>;
}

export function MovementsScreen() {
	const insets = useSafeAreaInsets();
	const [filterIndex, setFilterIndex] = useState(0);
	const paddingTop = insets.top + 22;
	const { startDate, endDate, rows } = SAMPLE_MOVEMENTS;
	const filter = FILTERS[filterIndex];

	if (rows.length === 0) {
		return (
			<View
				className="flex-1 bg-background px-6"
				style={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			>
				<Title />
				<View className="flex-1 justify-center">
					<Text className="text-[26px] leading-tight font-semibold text-foreground">
						Aún no registras movimientos.
					</Text>
					<Text className="mt-2.5 text-sm text-muted-foreground">
						Toca el micrófono y di algo como «almuerzo 15 soles».
					</Text>
				</View>
			</View>
		);
	}

	const header = (
		<View>
			<Title />
			{/* Luego: flechas a ciclos anteriores (falta query). */}
			<Text className="mt-3.5 text-center font-mono text-[15px] text-foreground">
				{formatDay(startDate)} – {formatDay(endDate)}
			</Text>
			<View className="mt-3.5">
				<Chips options={FILTERS} selectedIndex={filterIndex} onChange={setFilterIndex} />
			</View>
		</View>
	);

	return (
		<SectionList
			className="flex-1 bg-background"
			contentContainerClassName="px-6"
			contentContainerStyle={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			sections={groupByDay(filterRows(rows, filter))}
			keyExtractor={(row) => row.id}
			stickySectionHeadersEnabled={false}
			ListHeaderComponent={header}
			ListEmptyComponent={
				<Text className="mt-[22px] text-sm text-muted-foreground">
					Aún no hay {filter === "Todos" ? "movimientos" : filter.toLowerCase()} en este ciclo.
				</Text>
			}
			renderSectionHeader={({ section }) => (
				<View className="mt-[22px] flex-row items-baseline justify-between gap-2.5">
					<Text className="shrink text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
						{formatDayHeading(section.title, SAMPLE_TODAY)}
					</Text>
					<Text className="shrink-0 font-mono text-[13px] text-muted-foreground">
						{signedAmount(dayTotalCents(section.data))}
					</Text>
				</View>
			)}
			renderItem={({ item }) => (
				<MovementRow
					row={item}
					goalName={SAMPLE_GOALS.find((goal) => goal.id === item.goalId)?.name ?? null}
				/>
			)}
		/>
	);
}
