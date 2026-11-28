import { formatCents } from "@quipu/backend/shared/budget";
import { formatDay } from "@quipu/backend/shared/dates";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Lock from "reicon-react-native/icons/Lock";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionLabel } from "@/components/ui/section-label";
import { PlusSheet } from "@/features/plus/plus-sheet";
import { SAMPLE_REPORT_CYCLE } from "@/features/report/sample";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";

const LOCKED_BARS = ["h-[52px]", "h-[84px]", "h-[68px]", "h-[100px]"] as const;

function SummaryRow({
	envelope,
	label,
	note,
	cents,
}: {
	envelope: keyof typeof ENVELOPE_DOT;
	label: string;
	note?: string;
	cents: number;
}) {
	return (
		<View className="min-h-14 flex-row items-center justify-between gap-3 border-b border-border py-2">
			<View className="min-w-0 flex-1 flex-row items-center gap-3">
				<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[envelope]}`} />
				<View className="min-w-0 flex-1">
					<Text className="text-[17px] font-semibold text-foreground">{label}</Text>
					{note ? <Text className="text-[13px] text-muted-foreground">{note}</Text> : null}
				</View>
			</View>
			<Text className="shrink-0 font-mono text-[15px] text-foreground">
				S/ {formatCents(cents)}
			</Text>
		</View>
	);
}

export default function ReportScreen() {
	const insets = useSafeAreaInsets();
	const muted = useThemeColor("--color-muted-foreground");
	const [plansOpen, setPlansOpen] = useState(false);
	const { startDate, endDate, marginCents, left, detail } = SAMPLE_REPORT_CYCLE;

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				contentContainerClassName="px-6"
				contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
			>
				<ScreenHeader title="Informe del ciclo" />

				<View className="mt-4">
					<SectionLabel>{`Ciclo ${formatDay(startDate)} – ${formatDay(endDate)}`}</SectionLabel>
				</View>
				<Text className="mt-2 text-4xl leading-10 font-semibold text-foreground">
					Te quedaron S/ {formatCents(marginCents)}
				</Text>

				<View className="mt-6">
					<SectionLabel>Resumen</SectionLabel>
				</View>
				<SummaryRow envelope="needs" label="Necesidades" cents={left.needsCents} />
				<SummaryRow envelope="wants" label="Gustos" cents={left.wantsCents} />
				{detail.kind === "ok" ? (
					<SummaryRow
						envelope="savings"
						label="Ahorro"
						note="Pasó a tu fondo"
						cents={detail.fundedCents}
					/>
				) : null}

				<View className="mt-7 flex-row items-center justify-between">
					<SectionLabel>Comparar ciclos</SectionLabel>
					<View className="flex-row items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
						<Lock size={14} color={muted} />
						<Text className="text-[13px] font-semibold text-muted-foreground">Con Plus</Text>
					</View>
				</View>
				<View className="mt-4 h-[100px] flex-row items-end gap-3" accessibilityElementsHidden>
					{LOCKED_BARS.map((height) => (
						<View key={height} className={`flex-1 rounded-xl bg-muted ${height}`} />
					))}
				</View>
				<Text className="mt-4 text-sm text-muted-foreground">
					Compara este ciclo con los anteriores, con el número del día de cada uno, los consejos del
					Coach y descárgalo en PDF o Excel.
				</Text>
				<View className="mt-4">
					<Button label="Ver planes" variant="secondary" onPress={() => setPlansOpen(true)} />
				</View>
			</ScrollView>
			<PlusSheet isPresented={plansOpen} onDismiss={() => setPlansOpen(false)} />
		</View>
	);
}
