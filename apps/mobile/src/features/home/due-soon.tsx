import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { daysBetween } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";
import { Text, View } from "react-native";

type CommitmentList = FunctionReturnType<typeof api.commitments.list>;
type Item = CommitmentList["items"][number];

function isDueSoon(item: Item) {
	return item.status === "upcoming" || item.status === "overdue";
}

function dueLabel(dueDate: string, today: string) {
	const days = daysBetween(today, dueDate);
	if (days < 0) return days === -1 ? "Venció ayer" : `Venció hace ${-days} días`;
	if (days === 0) return "Vence hoy";
	if (days === 1) return "Vence mañana";
	return `Vence en ${days} días`;
}

export function DueSoon({ items, today }: { items: Item[]; today: string }) {
	const dueSoon = items.filter(isDueSoon);
	if (dueSoon.length === 0) return null;

	return (
		<View className="mt-[18px]">
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Por pagar
			</Text>
			{dueSoon.map((item) => (
				<View
					key={item.id}
					className="flex-row items-center justify-between gap-2 border-b border-border py-3"
				>
					<View className="min-w-0 flex-1">
						<Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
							{item.name}
						</Text>
						<Text className="mt-0.5 text-[13px] text-muted-foreground">
							{dueLabel(item.dueDate, today)}
						</Text>
					</View>
					<Text className="shrink-0 font-mono text-[15px] text-foreground">
						S/ {formatCents(item.amountCents)}
					</Text>
				</View>
			))}
		</View>
	);
}
