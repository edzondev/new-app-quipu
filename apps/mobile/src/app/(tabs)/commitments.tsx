import { groupCommitments } from "@quipu/backend/shared/commitments";
import { Pressable, ScrollView, Text, View } from "react-native";
import Plus from "reicon-react-native/icons/Plus";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { CommitmentRow } from "@/features/commitments/commitment-row";
import { dueLine, paymentFrequency } from "@/features/commitments/commitment-text";
import { SAMPLE_COMMITMENTS, SAMPLE_TODAY } from "@/features/home/sample";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { wholeSoles } from "@/features/savings/progress";
import { useThemeColor } from "@/lib/use-theme-color";

function Title() {
	return <Text className="text-3xl font-semibold text-foreground">Compromisos</Text>;
}

export default function CommitmentsScreen() {
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("--color-foreground");
	const paddingTop = insets.top + 22;
	const { items, payments, payableCents, paidCents } = SAMPLE_COMMITMENTS;

	if (items.length === 0 && payments.length === 0) {
		return (
			<View
				className="flex-1 bg-background px-6"
				style={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			>
				<Title />
				<View className="flex-1 justify-center">
					<Text className="text-[26px] leading-tight font-semibold text-foreground">
						Sin compromisos.
					</Text>
					<Text className="mt-2.5 text-sm text-muted-foreground">
						Añade tus pagos fijos y Quipu los reserva por ti.
					</Text>
					<View className="mt-4 self-start">
						{/* Luego: hoja F2 */}
						<Button label="Añadir compromiso" onPress={() => {}} />
					</View>
				</View>
			</View>
		);
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="px-6"
			contentContainerStyle={{ paddingTop, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
		>
			<Title />
			<Text className="mt-1 text-[13px] text-muted-foreground">
				Reservados antes de que gastes un sol.
			</Text>
			<View className="mt-[22px] flex-row items-center justify-between gap-2.5">
				<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
					Por pagar este ciclo
				</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Añadir compromiso"
					// Luego: hoja F2
					onPress={() => {}}
					className="size-11 shrink-0 items-center justify-center rounded-full bg-secondary"
				>
					<Plus size={18} color={foreground} />
				</Pressable>
			</View>
			<View className="flex-row flex-wrap items-baseline gap-x-1.5">
				<Text className="font-mono text-[34px] tracking-tight text-foreground">
					S/ {wholeSoles(payableCents)}
				</Text>
				<Text className="text-[13px] text-muted-foreground">
					· S/ {wholeSoles(paidCents)} ya pagado
				</Text>
			</View>
			{groupCommitments(items).pending.map((item) => (
				<CommitmentRow
					key={item.id}
					name={item.name}
					amountCents={item.amountCents}
					line={dueLine(item, false, SAMPLE_TODAY)}
					status={item.status}
				/>
			))}
			{payments.map((payment) => (
				<CommitmentRow
					key={payment.paymentId}
					name={payment.name}
					amountCents={payment.amountCents}
					line={dueLine(
						{ ...payment, frequency: paymentFrequency(payment, items) },
						true,
						SAMPLE_TODAY,
					)}
					status="paid"
				/>
			))}
			{/* Luego: «Más adelante» y «Pagados antes», pendiente de Mira. */}
		</ScrollView>
	);
}
