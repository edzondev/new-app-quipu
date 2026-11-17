import type { api } from "@quipu/backend/convex/_generated/api";
import { AMOUNT_KEYS, ENVELOPE_LABELS, type Envelope } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import AngleDown from "reicon-react-native/icons/AngleDown";
import { wholeSoles } from "@/features/savings/progress";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";
import { cycleTitle, leftText, marginText, type MarginTone } from "./cycle-text";

type Cycle = FunctionReturnType<typeof api.progress.list>["cycles"][number];

const MARGIN_TEXT = {
	default: "text-foreground",
	over: "text-warning-foreground",
	muted: "text-muted-foreground",
} as const satisfies Record<MarginTone, string>;

const SPENDABLE = ["needs", "wants"] as const;

function Summary({ cycle, icon }: { cycle: Cycle; icon: ReactNode }) {
	const margin = marginText(cycle.marginCents);

	return (
		<View className="min-h-11 flex-row items-center justify-between gap-2.5">
			<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
				<View
					className={`size-2 shrink-0 rounded-full ${cycle.marginCents < 0 ? "bg-warning" : "bg-envelope-savings"}`}
				/>
				<Text
					className="min-w-0 flex-1 text-[15px] font-semibold text-foreground"
					numberOfLines={1}
				>
					{cycleTitle(cycle.startDate, cycle.endDate)}
				</Text>
			</View>
			<Text className={`shrink-0 text-sm ${MARGIN_TEXT[margin.tone]}`}>{margin.text}</Text>
			{icon}
		</View>
	);
}

function Line({
	envelope,
	spent,
	result,
	over,
}: {
	envelope: Envelope;
	spent: string;
	result: string;
	over: boolean;
}) {
	return (
		<View className="flex-row items-center justify-between gap-2.5 py-1.5">
			<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
				<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[envelope]}`} />
				<View className="min-w-0 flex-1">
					<Text className="text-sm text-foreground" numberOfLines={1}>
						{ENVELOPE_LABELS[envelope]}
					</Text>
					<Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
						{spent}
					</Text>
				</View>
			</View>
			<Text
				className={`shrink-0 font-mono text-[13px] ${over ? "text-warning-foreground" : "text-foreground"}`}
			>
				{result}
			</Text>
		</View>
	);
}

export function CycleRow({ cycle, defaultOpen }: { cycle: Cycle; defaultOpen: boolean }) {
	const [open, setOpen] = useState(defaultOpen);
	const muted = useThemeColor("--color-muted-foreground");
	const { detail } = cycle;

	if (detail.kind === "unavailable") {
		return (
			<View className="border-b border-border">
				<Summary cycle={cycle} icon={null} />
				<Text className="pb-3 pl-5 text-[13px] text-muted-foreground">
					Detalle no disponible para este ciclo
				</Text>
			</View>
		);
	}

	return (
		<View className="border-b border-border">
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen(!open)}
			>
				<Summary
					cycle={cycle}
					icon={
						<View className={open ? "" : "-rotate-90"}>
							<AngleDown size={16} color={muted} />
						</View>
					}
				/>
			</Pressable>
			{open ? (
				<View className="pb-3 pl-5">
					{SPENDABLE.map((envelope) => {
						const key = AMOUNT_KEYS[envelope];
						const left = leftText(cycle.left[key]);
						return (
							<Line
								key={envelope}
								envelope={envelope}
								spent={`Gastado S/ ${wholeSoles(detail.spent[key])}`}
								result={left.text}
								over={left.over}
							/>
						);
					})}
					{detail.fundedCents > 0 ? (
						<Line
							envelope="savings"
							spent={`S/ ${wholeSoles(detail.fundedCents)} pasó a tu fondo`}
							result="Guardado"
							over={false}
						/>
					) : null}
				</View>
			) : null}
		</View>
	);
}
