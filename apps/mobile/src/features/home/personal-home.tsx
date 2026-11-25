import type { api } from "@quipu/backend/convex/_generated/api";
import { formatDaysLeft } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SectionLabel } from "@/components/ui/section-label";
import { DayNumber } from "@/features/home/day-number";
import { DueSoon } from "@/features/home/due-soon";
import { EmptyCycle } from "@/features/home/empty-states";
import { Envelopes } from "@/features/home/envelopes";
import { FormulaSheet } from "@/features/home/formula-sheet";
import { todaySpendSummary } from "@/features/home/today-spend";

type Home = FunctionReturnType<typeof api.balances.getHome>;
type CommitmentList = FunctionReturnType<typeof api.commitments.list>;

export function PersonalHome({
	home,
	items,
	today,
}: {
	home: Home;
	items: CommitmentList["items"];
	today: string;
}) {
	const [formulaOpen, setFormulaOpen] = useState(false);

	if (home.empty)
		return (
			<EmptyCycle
				startDate={home.startDate}
				endDate={home.endDate}
				planIncomeCents={home.planIncomeCents}
			/>
		);

	const hero = todaySpendSummary(home);
	const daysLeft = formatDaysLeft(home.daysLeft);
	const daysLeftLabel = `${daysLeft.charAt(0).toUpperCase()}${daysLeft.slice(1)}`;
	const subtitle = hero.daily ? `Sin comprometer tu ciclo. ${daysLeftLabel}.` : daysLeftLabel;

	return (
		<>
			<View className="mt-[22px] flex-row items-center gap-2">
				<SectionLabel>{hero.label}</SectionLabel>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Cómo se calcula"
					hitSlop={12}
					onPress={() => setFormulaOpen(true)}
					className="size-6 items-center justify-center rounded-full border-[1.5px] border-input active:opacity-60"
				>
					<Text className="text-xs font-bold text-muted-foreground">i</Text>
				</Pressable>
			</View>
			<View className="mt-2">
				<DayNumber whole={hero.whole} decimals={hero.decimals} over={hero.over} />
			</View>
			<Text className="mt-2.5 text-[13px] text-muted-foreground">{subtitle}</Text>

			<View className="mt-[22px]">
				<Envelopes home={home} />
			</View>

			<DueSoon items={items} today={today} />

			<FormulaSheet home={home} isPresented={formulaOpen} onDismiss={() => setFormulaOpen(false)} />
		</>
	);
}
