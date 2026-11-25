import { formatCents } from "@quipu/backend/shared/budget";
import type { CommitmentStatus } from "@quipu/backend/shared/commitments";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

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

type Link = { label: string; onPress: () => void };

export function RowLink({
	label,
	onPress,
	warning = false,
	disabled = false,
}: Link & { warning?: boolean; disabled?: boolean }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			className="min-h-11 justify-center self-start active:opacity-60"
		>
			<Text
				className={`text-[13px] font-semibold underline ${warning ? "text-warning-foreground" : "text-foreground"}`}
			>
				{label}
			</Text>
		</Pressable>
	);
}

/** `onPress` opens the commitment; `pay` is the link under it and `below` what goes after it. */
export function CommitmentRow({
	name,
	amountCents,
	line,
	status,
	onPress,
	pay,
	below,
}: {
	name: string;
	amountCents: number;
	line: string;
	status: CommitmentStatus;
	onPress?: () => void;
	pay?: Link | null;
	below?: ReactNode;
}) {
	const pill = PILL[status];

	return (
		<View className="border-b border-border py-3">
			<Pressable
				accessibilityRole={onPress ? "button" : undefined}
				accessibilityHint={onPress ? "Abre el compromiso" : undefined}
				disabled={!onPress}
				onPress={onPress}
				className="flex-row items-center justify-between gap-2.5 active:opacity-60"
			>
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
			</Pressable>
			{pay ? <RowLink {...pay} warning={status === "overdue"} /> : null}
			{below}
		</View>
	);
}
