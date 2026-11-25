import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { formatDay } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";
import { Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SheetHeader } from "@/components/ui/sheet-header";
import { freeCents } from "@/features/home/today-spend";

type Home = FunctionReturnType<typeof api.balances.getHome>;

function Line({
	label,
	value,
	strong = false,
}: {
	label: string;
	value: string;
	strong?: boolean;
}) {
	return (
		<View
			className={`flex-row items-baseline justify-between gap-3 py-2 ${strong ? "border-t border-border" : ""}`}
		>
			<Text
				className={`min-w-0 flex-1 text-[15px] ${strong ? "font-semibold text-foreground" : "text-muted-foreground"}`}
			>
				{label}
			</Text>
			<Text className="shrink-0 font-mono text-[15px] text-foreground">{value}</Text>
		</View>
	);
}

/** C6: the day number is the free money divided by the days left, counting today. */
export function FormulaSheet({
	home,
	isPresented,
	onDismiss,
}: {
	home: Home;
	isPresented: boolean;
	onDismiss: () => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<SheetHeader title="Cómo se calcula" />
			<Text className="mt-1 text-sm leading-5 text-muted-foreground">
				Lo libre, dividido entre los días que faltan para el cierre.
			</Text>
			<View className="mt-4">
				<Line label="Libre en Necesidades + Gustos" value={`S/ ${formatCents(freeCents(home))}`} />
				<Line
					label={`÷ días hasta el cierre (${formatDay(home.endDate)})`}
					value={String(home.daysLeft)}
				/>
				<Line label="= puedes gastar hoy" value={`S/ ${formatCents(home.dailyCents)}`} strong />
			</View>
			<Text className="mt-3 text-[13px] leading-[19px] text-muted-foreground">
				Lo libre ya no incluye tus compromisos por pagar ni tu ahorro.
			</Text>
			<View className="mt-5">
				<Button label="Entendido" onPress={onDismiss} />
			</View>
		</BottomSheet>
	);
}
