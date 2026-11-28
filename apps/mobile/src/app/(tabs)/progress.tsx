import type { api } from "@quipu/backend/convex/_generated/api";
import {
	AMOUNT_KEYS,
	type Envelope,
	ENVELOPE_LABELS,
	wholeSoles,
} from "@quipu/backend/shared/budget";
import { formatPastDay } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";
import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { LayoutAnimationConfig } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpandChevron } from "@/components/ui/expand-chevron";
import { SAMPLE_TODAY } from "@/features/home/sample";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { SAMPLE_CYCLES, SAMPLE_STREAK } from "@/features/progress/sample";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { enter, exit, layout } from "@/lib/motion";

type MarginTone = "default" | "over" | "muted";

function cycleTitle(startDate: string, endDate: string, today: string) {
	return `${formatPastDay(startDate, today)} – ${formatPastDay(endDate, today)}`;
}

function marginText(marginCents: number): { text: string; tone: MarginTone } {
	if (marginCents > 0) return { text: `Sobró S/ ${wholeSoles(marginCents)}`, tone: "default" };
	if (marginCents < 0) {
		return { text: `Te pasaste por S/ ${wholeSoles(-marginCents)}`, tone: "over" };
	}
	return { text: "Cerraste sin sobrante", tone: "muted" };
}

function leftText(cents: number) {
	return cents < 0
		? { text: `Exceso S/ ${wholeSoles(-cents)}`, over: true }
		: { text: `Sobró S/ ${wholeSoles(cents)}`, over: false };
}

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
					{cycleTitle(cycle.startDate, cycle.endDate, SAMPLE_TODAY)}
				</Text>
			</View>
			<Text className={`shrink-0 text-sm ${MARGIN_TEXT[margin.tone]}`}>{margin.text}</Text>
			{icon}
		</View>
	);
}

function Line({
	envelope,
	detail,
	result,
	over,
}: {
	envelope: Envelope;
	detail: string;
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
						{detail}
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

function CycleRow({ cycle, defaultOpen }: { cycle: Cycle; defaultOpen: boolean }) {
	const [open, setOpen] = useState(defaultOpen);
	const { detail } = cycle;

	if (detail.kind === "unavailable") {
		return (
			<Animated.View layout={layout} className="border-b border-border">
				<Summary cycle={cycle} icon={null} />
				<Text className="pb-3 pl-5 text-[13px] text-muted-foreground">
					Detalle no disponible para este ciclo
				</Text>
			</Animated.View>
		);
	}

	return (
		<Animated.View layout={layout} className="border-b border-border">
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen(!open)}
				className="active:opacity-60"
			>
				<Summary cycle={cycle} icon={<ExpandChevron open={open} />} />
			</Pressable>
			{open ? (
				<Animated.View entering={enter} exiting={exit} className="pb-3 pl-5">
					{SPENDABLE.map((envelope) => {
						const key = AMOUNT_KEYS[envelope];
						const left = leftText(cycle.left[key]);
						return (
							<Line
								key={envelope}
								envelope={envelope}
								detail={`Gastado S/ ${wholeSoles(detail.spent[key])}`}
								result={left.text}
								over={left.over}
							/>
						);
					})}
					{detail.fundedCents > 0 ? (
						<Line
							envelope="savings"
							detail={`Pasó a tu fondo S/ ${wholeSoles(detail.fundedCents)}`}
							result="Guardado"
							over={false}
						/>
					) : null}
				</Animated.View>
			) : null}
		</Animated.View>
	);
}

function Title() {
	return <Text className="text-3xl font-semibold text-foreground">Progreso</Text>;
}

function Streak() {
	const { streak, exact } = SAMPLE_STREAK;

	if (streak === 0) {
		return (
			<Text className="mt-3.5 text-[13px] text-muted-foreground">
				Todavía no tienes ciclos seguidos sin quedarte sin margen
			</Text>
		);
	}

	return (
		<View className="mt-3.5 flex-row items-baseline gap-2.5">
			{exact ? null : <Text className="text-xs text-muted-foreground">Al menos</Text>}
			<Text className="font-mono text-[56px] leading-none text-foreground">{streak}</Text>
			<View className="shrink">
				<Text className="text-[15px] font-semibold text-foreground">
					{streak === 1 ? "ciclo seguido" : "ciclos seguidos"}
				</Text>
				<Text className="text-[15px] font-semibold text-foreground">sin quedarte sin margen</Text>
			</View>
		</View>
	);
}

export default function ProgressScreen() {
	const insets = useSafeAreaInsets();
	const paddingTop = insets.top + 22;
	const { cycles } = SAMPLE_CYCLES;

	if (cycles.length === 0) {
		return (
			<View
				className="flex-1 bg-background px-6"
				style={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			>
				<Title />
				<View className="flex-1 justify-center">
					<Text className="text-[26px] leading-tight font-semibold text-foreground">
						Aún no cierras un ciclo.
					</Text>
					<Text className="mt-2.5 text-sm text-muted-foreground">Tu historial aparecerá aquí.</Text>
				</View>
			</View>
		);
	}

	const openId = cycles.find(({ detail }) => detail.kind === "ok")?.id;

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="px-6"
			contentContainerStyle={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
		>
			<Title />
			{SAMPLE_STREAK.hasActive ? <Streak /> : null}
			{cycles[0].marginCents > 0 ? (
				<Text className="mt-2.5 text-[13px] text-muted-foreground">
					Lo que sobró ya está en tus sobres de este ciclo.
				</Text>
			) : null}
			<Text className="mt-[22px] text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Ciclos
			</Text>
			{/* The cycle open by default is there from the start: only opening and closing animate. */}
			<LayoutAnimationConfig skipEntering>
				{cycles.map((cycle) => (
					<CycleRow key={cycle.id} cycle={cycle} defaultOpen={cycle.id === openId} />
				))}
			</LayoutAnimationConfig>
		</ScrollView>
	);
}
