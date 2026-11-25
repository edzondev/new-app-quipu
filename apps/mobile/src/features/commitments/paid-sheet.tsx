import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Text, View } from "react-native";
import { SheetHeader } from "@/components/ui/sheet-header";
import { RemoveConfirm, RemoveLink } from "@/features/commitments/commitment-actions";
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
	const [removing, setRemoving] = useState(false);

	if (removing) {
		return (
			<RemoveConfirm
				space={space}
				item={item}
				onCancel={() => setRemoving(false)}
				onDone={onDone}
			/>
		);
	}

	return (
		<View>
			<SheetHeader title={item.name} sub={paidBeforeLine(item, today)} />
			<Text className="mt-2 font-mono text-[34px] tracking-tight text-foreground">
				S/ {formatCents(item.amountCents)}
			</Text>
			<View className="my-2">
				<RemoveLink onPress={() => setRemoving(true)} />
			</View>
		</View>
	);
}
