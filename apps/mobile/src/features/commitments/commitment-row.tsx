import { formatCents } from "@quipu/backend/shared/budget";
import type { CommitmentStatus } from "@quipu/backend/shared/commitments";
import { Pressable, Text, View } from "react-native";
import { payLabel } from "./commitment-text";

const PILL = {
	overdue: { label: "Vencido", box: "bg-warning/15", text: "text-warning-foreground" },
	upcoming: { label: "Próximo", box: "bg-secondary", text: "text-foreground" },
	reserved: { label: "Reservado", box: "bg-secondary", text: "text-muted-foreground" },
	paid: {
		label: "Pagado",
		box: "border border-envelope-savings/30",
		text: "text-envelope-savings",
	},
	later: null,
} as const satisfies Record<CommitmentStatus, { label: string; box: string; text: string } | null>;

export function CommitmentRow({
	name,
	amountCents,
	line,
	status,
}: {
	name: string;
	amountCents: number;
	line: string;
	status: CommitmentStatus;
}) {
	const pill = PILL[status];
	const link = payLabel(status);

	return (
		<View className="border-b border-border py-3">
			<View className="flex-row items-center justify-between gap-2.5">
				<View className="min-w-0 flex-1">
					<Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
						{name}
					</Text>
					<Text className="mt-0.5 text-[13px] text-muted-foreground" numberOfLines={1}>
						{line}
					</Text>
				</View>
				<View className="shrink-0 items-end gap-1.5">
					<Text className="font-mono text-[15px] text-foreground">
						S/ {formatCents(amountCents)}
					</Text>
					{pill === null ? null : (
						<View className={`rounded-full px-2 py-1 ${pill.box}`}>
							<Text className={`text-[10.5px] font-bold tracking-wider uppercase ${pill.text}`}>
								{pill.label}
							</Text>
						</View>
					)}
				</View>
			</View>
			{link === null ? null : (
				<Pressable
					accessibilityRole="button"
					// Luego: hoja F3
					onPress={() => {}}
					className="min-h-11 justify-center self-start active:opacity-60"
				>
					<Text
						className={`text-[13px] font-semibold underline ${status === "overdue" ? "text-warning-foreground" : "text-foreground"}`}
					>
						{link}
					</Text>
				</Pressable>
			)}
		</View>
	);
}
