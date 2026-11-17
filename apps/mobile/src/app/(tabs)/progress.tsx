import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { CycleRow } from "@/features/progress/cycle-row";
import { SAMPLE_CYCLES, SAMPLE_STREAK } from "@/features/progress/sample";

function Title() {
	return <Text className="text-3xl font-semibold text-foreground">Progreso</Text>;
}

function Streak() {
	const { streak, exact } = SAMPLE_STREAK;

	if (streak === 0) {
		return (
			<Text className="mt-3.5 text-[13px] text-muted-foreground">
				Todavía no tienes ciclos seguidos sin quedarte sin margen
			</Text>
		);
	}

	return (
		<View className="mt-3.5 flex-row items-baseline gap-2.5">
			{exact ? null : <Text className="text-xs text-muted-foreground">Al menos</Text>}
			<Text className="font-mono text-[56px] leading-none text-foreground">{streak}</Text>
			<View className="shrink">
				<Text className="text-[15px] font-semibold text-foreground">
					{streak === 1 ? "ciclo seguido" : "ciclos seguidos"}
				</Text>
				<Text className="text-[15px] font-semibold text-foreground">sin quedarte sin margen</Text>
			</View>
		</View>
	);
}

export default function ProgressScreen() {
	const insets = useSafeAreaInsets();
	const paddingTop = insets.top + 22;
	const { cycles } = SAMPLE_CYCLES;

	if (cycles.length === 0) {
		return (
			<View
				className="flex-1 bg-background px-6"
				style={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			>
				<Title />
				<View className="flex-1 justify-center">
					<Text className="text-[26px] leading-tight font-semibold text-foreground">
						Aún no cierras un ciclo.
					</Text>
					<Text className="mt-2.5 text-sm text-muted-foreground">Tu historial aparecerá aquí.</Text>
				</View>
			</View>
		);
	}

	const openId = cycles.find(({ detail }) => detail.kind === "ok")?.id;

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="px-6"
			contentContainerStyle={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
		>
			<Title />
			<Streak />
			{cycles[0].marginCents > 0 ? (
				<Text className="mt-2.5 text-[13px] text-muted-foreground">
					Lo que sobró ya está en tus sobres de este ciclo.
				</Text>
			) : null}
			<Text className="mt-[22px] text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Ciclos
			</Text>
			{cycles.map((cycle) => (
				<CycleRow key={cycle.id} cycle={cycle} defaultOpen={cycle.id === openId} />
			))}
		</ScrollView>
	);
}
