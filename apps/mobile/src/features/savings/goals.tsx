import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Pressable, Text, View } from "react-native";
import Check from "reicon-react-native/icons/Check";
import Plus from "reicon-react-native/icons/Plus";
import { Button } from "@/components/ui/button";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";
import { goalPercent, missingCents, targetMonthLabel, wholeSoles } from "./progress";
import { ProgressBar } from "./progress-bar";

type Goal = FunctionReturnType<typeof api.goals.list>[number];

const GOAL_COLORS = ["wants", "needs", "savings"] as const;

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
	const foreground = useThemeColor("--color-foreground");
	const color = ENVELOPE_DOT[GOAL_COLORS[index % GOAL_COLORS.length]];
	const savings = useThemeColor("--color-envelope-savings");
	const done = goal.savedCents >= goal.targetCents;
	const line = done
		? "Meta alcanzada"
		: `${targetMonthLabel(goal.targetMonth)} · faltan S/ ${wholeSoles(missingCents(goal.savedCents, goal.targetCents))}`;

	return (
		<View className="mb-2.5 rounded-[22px] bg-muted px-4 py-3.5">
			<View className="flex-row items-center justify-between gap-2">
				<View className="min-w-0 flex-1">
					<View className="flex-row items-center gap-2.5">
						<View className={`size-2 shrink-0 rounded-full ${color}`} />
						<Text
							className="min-w-0 flex-1 text-[15px] font-semibold text-foreground"
							numberOfLines={1}
						>
							{goal.name}
						</Text>
					</View>
					<Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
						{line}
					</Text>
				</View>
				{done ? (
					<View className="shrink-0 flex-row items-center gap-1">
						<Check size={14} color={savings} />
						<Text className="text-[13px] font-semibold text-envelope-savings">Lista</Text>
					</View>
				) : (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Aportar a ${goal.name}`}
						// Luego: hoja G2
						onPress={() => {}}
						className="min-h-11 shrink-0 flex-row items-center gap-1"
					>
						<Plus size={14} color={foreground} />
						<Text className="text-[13px] font-semibold text-foreground">Aportar</Text>
					</Pressable>
				)}
			</View>
			<View className="mt-1 flex-row items-baseline gap-1.5">
				<Text className="font-mono text-lg text-foreground">S/ {wholeSoles(goal.savedCents)}</Text>
				<Text className="text-xs text-muted-foreground">de S/ {wholeSoles(goal.targetCents)}</Text>
			</View>
			<View className="mt-2">
				<ProgressBar
					percent={goalPercent(goal.savedCents, goal.targetCents)}
					height="h-[5px]"
					fill={color}
				/>
			</View>
		</View>
	);
}

export function Goals({ goals }: { goals: Goal[] }) {
	return (
		<View className="mt-[22px]">
			<View className="min-h-8 flex-row items-center justify-between">
				<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
					Tus metas
				</Text>
				{goals.length === 0 ? null : (
					<Text className="text-xs text-muted-foreground">Cada una con su propio saldo</Text>
				)}
			</View>
			{goals.length === 0 ? (
				<View className="mt-1.5 rounded-[22px] border-[1.5px] border-dashed border-input px-[18px] pt-[18px] pb-4">
					<Text className="text-[15px] font-semibold text-foreground">Crea tu primera meta</Text>
					<Text className="mt-1 text-[13px] text-muted-foreground">
						Un viaje, una laptop, un curso. Cada meta junta su propio saldo.
					</Text>
					<View className="mt-3 self-start">
						{/* Luego: hoja G4 (con 2 metas en Gratis, K1) */}
						<Button label="Crear meta" onPress={() => {}} />
					</View>
				</View>
			) : (
				goals.map((goal, index) => <GoalCard key={goal.id} goal={goal} index={index} />)
			)}
			{goals.length === 0 ? null : (
				<View className="mt-1.5">
					{/* Luego: hoja G4 (con 2 metas en Gratis, K1) */}
					<Button label="Nueva meta" variant="secondary" onPress={() => {}} />
				</View>
			)}
		</View>
	);
}
