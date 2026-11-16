import { formatDayHeading } from "@quipu/backend/shared/dates";
import { SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SAMPLE_TODAY } from "@/features/home/sample";
import { MovementRow } from "@/features/movements/movement-row";
import { groupByDay } from "@/features/movements/rows";
import { SAMPLE_MOVEMENTS } from "@/features/movements/sample";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { SAMPLE_GOALS } from "@/features/savings/sample";

function Title() {
	return <Text className="text-3xl font-semibold text-foreground">Movimientos</Text>;
}

export default function MovementsScreen() {
	const insets = useSafeAreaInsets();
	const paddingTop = insets.top + 22;
	const { rows } = SAMPLE_MOVEMENTS;

	if (rows.length === 0) {
		return (
			<View
				className="flex-1 bg-background px-6"
				style={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			>
				<Title />
				<View className="flex-1 items-center justify-center">
					<Text className="text-center text-[26px] leading-tight font-semibold text-foreground">
						Aún no registras movimientos.
					</Text>
					<Text className="mt-2.5 text-center text-sm text-muted-foreground">
						Toca el micrófono y di algo como «almuerzo 15 soles».
					</Text>
				</View>
			</View>
		);
	}

	return (
		<SectionList
			className="flex-1 bg-background"
			contentContainerClassName="px-6"
			contentContainerStyle={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			sections={groupByDay(rows)}
			keyExtractor={(row) => row.id}
			stickySectionHeadersEnabled={false}
			ListHeaderComponent={Title}
			renderSectionHeader={({ section }) => (
				<Text className="mt-[22px] text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
					{formatDayHeading(section.title, SAMPLE_TODAY)}
				</Text>
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
