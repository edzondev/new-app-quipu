import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { amountParts } from "@/features/home/today-spend";
import { goalPercent, monthsCovered } from "./goal-progress";
import { wholeSoles } from "@quipu/backend/shared/budget";
import { ProgressBar } from "./progress-bar";

type Fund = FunctionReturnType<typeof api.goals.fund>;

export function FundCard({ fund }: { fund: Fund }) {
	const { whole, decimals } = amountParts(fund.fundCents);
	const goal = fund.fundGoalCents ?? fund.suggestedFundGoalCents;
	const goalCents = goal !== null && goal > 0 ? goal : null;
	const months = monthsCovered(fund.fundCents, fund.suggestedFundGoalCents);
	const percent = goalCents === null ? null : goalPercent(fund.fundCents, goalCents);

	return (
		<View className="mt-3 rounded-[22px] bg-muted px-4 py-3.5">
			<View className="flex-row items-center justify-between gap-2">
				<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
					Fondo de emergencia
				</Text>
				{goalCents === null ? null : (
					<Pressable
						accessibilityRole="button"
						hitSlop={8}
						// Luego: hoja G6
						onPress={() => {}}
						className="min-h-8 shrink-0 justify-center active:opacity-60"
					>
						<Text className="text-xs text-muted-foreground underline">
							Meta: S/ {wholeSoles(goalCents)}
						</Text>
					</Pressable>
				)}
			</View>
			<View className="mt-1 flex-row items-start">
				<Text className="mt-2 mr-1 text-lg text-muted-foreground">S/</Text>
				<Text className="font-mono text-[44px] leading-none tracking-tight text-foreground">
					{whole}
					<Text className="text-[19px] text-muted-foreground">.{decimals}</Text>
				</Text>
			</View>
			{months === null ? null : (
				<Text className="mt-1.5 text-[13px] text-muted-foreground">
					Cubre {months} de Necesidades
				</Text>
			)}
			{percent === null ? null : (
				<>
					<View className="mt-2.5">
						<ProgressBar percent={percent} height="h-1.5" fill="bg-envelope-savings" />
					</View>
					<Text className="mt-1.5 text-xs text-muted-foreground">{percent} % de tu meta</Text>
				</>
			)}
			<View className="mt-3 flex-row gap-2">
				<View className="flex-1">
					{/* Luego: hoja G5 */}
					<Button label="Retirar" variant="secondary" onPress={() => {}} />
				</View>
				<View className="flex-1">
					{/* Luego: hoja G7 */}
					<Button label="Aportar" onPress={() => {}} />
				</View>
			</View>
		</View>
	);
}
