import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SAMPLE_HOME } from "@/features/home/sample";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { FundCard } from "@/features/savings/fund-card";
import { Goals } from "@/features/savings/goals";
import { wholeSoles } from "@/features/savings/progress";
import { SAMPLE_FUND, SAMPLE_GOALS } from "@/features/savings/sample";

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<View className="flex-1">
			<Text className="text-xs text-muted-foreground">{label}</Text>
			<Text className="mt-0.5 font-mono text-sm text-foreground">{value}</Text>
		</View>
	);
}

export default function SavingsScreen() {
	const insets = useSafeAreaInsets();
	const savedCents = SAMPLE_GOALS.reduce(
		(sum, goal) => sum + goal.savedCents,
		SAMPLE_FUND.fundCents,
	);

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="px-6"
			contentContainerStyle={{
				paddingTop: insets.top + 22,
				paddingBottom: insets.bottom + TAB_BAR_SPACE,
			}}
		>
			<Text className="text-3xl font-semibold text-foreground">Ahorros</Text>
			<Text className="mt-1 text-[13px] text-muted-foreground">
				Lo que separas hoy cuida tu mes de mañana.
			</Text>
			<View className="mt-3 flex-row gap-2.5">
				<Stat
					label="Planeado este ciclo"
					value={`S/ ${wholeSoles(SAMPLE_HOME.assigned.savingsCents)} · S/ ${wholeSoles(SAMPLE_HOME.savingsCents)} apartados`}
				/>
				<Stat label="Ya guardado · Fondo + metas" value={`S/ ${wholeSoles(savedCents)}`} />
			</View>
			<FundCard fund={SAMPLE_FUND} />
			<Goals goals={SAMPLE_GOALS} />
		</ScrollView>
	);
}
