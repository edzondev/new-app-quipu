import type { api } from "@quipu/backend/convex/_generated/api";
import { wholeSoles } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { amountParts } from "@/features/home/today-spend";
import { goalPercent, monthsCovered } from "./goal-progress";
import { ProgressBar } from "./progress-bar";

type Fund = FunctionReturnType<typeof api.goals.fund>;

/** G1, with the web's rules: the bar only for a goal that was set, and «Retirar» only with money in the fund. */
export function FundCard({
	fund,
	onContribute,
	onWithdraw,
	onEditGoal,
}: {
	fund: Fund;
	onContribute: () => void;
	onWithdraw: () => void;
	onEditGoal: () => void;
}) {
	const { fundCents, fundGoalCents } = fund;
	const { whole, decimals } = amountParts(fundCents);
	const months = monthsCovered(fundCents, fund.suggestedFundGoalCents);
	const percent = fundGoalCents ? goalPercent(fundCents, fundGoalCents) : null;

	return (
		<View className="mt-3 border-b border-border py-3.5">
			<View className="flex-row items-center justify-between gap-2">
				<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
					Fondo de emergencia
				</Text>
				<Pressable
					accessibilityRole="button"
					hitSlop={8}
					onPress={onEditGoal}
					className="min-h-8 shrink-0 justify-center active:opacity-60"
				>
					<Text className="text-xs text-muted-foreground underline">
						{fundGoalCents ? `Meta: S/ ${wholeSoles(fundGoalCents)}` : "Definir meta"}
					</Text>
				</Pressable>
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
					<Text className="mt-1.5 text-xs text-muted-foreground">
						{percent >= 100 ? "Meta alcanzada" : `${percent} % de tu meta`}
					</Text>
				</>
			)}
			<View className="mt-3 flex-row gap-2">
				{fundCents > 0 ? (
					<View className="flex-1">
						<Button label="Retirar" variant="secondary" onPress={onWithdraw} />
					</View>
				) : null}
				<View className="flex-1">
					<Button label="Aportar" onPress={onContribute} />
				</View>
			</View>
		</View>
	);
}
