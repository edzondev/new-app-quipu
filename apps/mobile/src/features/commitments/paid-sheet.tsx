import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Text, View } from "react-native";
import { SheetHeader } from "@/components/ui/sheet-header";
import {
	DueMonthList,
	DueMonthRow,
	RemoveConfirm,
	RemoveLink,
} from "@/features/commitments/commitment-actions";
import { paidBeforeLine } from "@/features/commitments/commitment-text";

type Item = FunctionReturnType<typeof api.commitments.list>["items"][number];
type PaidItem = Extract<Item, { status: "paid" }>;

/** A paid commitment cannot be edited (the web hides «Editar»): it shows as it is, with its actions. */
export function PaidSheet({
	space,
	item,
	today,
	onDone,
}: {
	space: "personal" | "household";
	item: PaidItem;
	today: string;
	onDone: () => void;
}) {
	const [view, setView] = useState<"due" | "remove" | null>(null);

	if (view === "due") {
		return <DueMonthList space={space} item={item} today={today} onDone={() => setView(null)} />;
	}
	if (view === "remove") {
		return (
			<RemoveConfirm space={space} item={item} onCancel={() => setView(null)} onDone={onDone} />
		);
	}

	return (
		<View>
			<SheetHeader title={item.name} sub={paidBeforeLine(item, today)} />
			<Text className="mt-2 font-mono text-[34px] tracking-tight text-foreground">
				S/ {formatCents(item.amountCents)}
			</Text>
			<View className="mt-2">
				<DueMonthRow item={item} today={today} onPress={() => setView("due")} />
			</View>
			<View className="mb-2">
				<RemoveLink onPress={() => setView("remove")} />
			</View>
		</View>
	);
}
