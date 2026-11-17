import { Text, View } from "react-native";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { movementText, type Row, type Tone } from "./rows";

const TONE_TEXT = {
	default: "text-foreground",
	savings: "text-envelope-savings",
} as const satisfies Record<Tone, string>;

export function MovementRow({ row, goalName }: { row: Row; goalName: string | null }) {
	const { name, detail, amount, tone } = movementText(row, goalName);

	return (
		<View className="flex-row items-center justify-between gap-2.5 border-b border-border py-3">
			<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
				<View
					className={`size-2 shrink-0 rounded-full ${row.envelope ? ENVELOPE_DOT[row.envelope] : "bg-muted-foreground"}`}
				/>
				<View className="min-w-0 flex-1">
					<Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
						{name}
					</Text>
					<Text className="mt-0.5 text-[13px] text-muted-foreground" numberOfLines={1}>
						{detail}
					</Text>
				</View>
			</View>
			<Text className={`shrink-0 font-mono text-[15px] ${TONE_TEXT[tone]}`}>{amount}</Text>
		</View>
	);
}
