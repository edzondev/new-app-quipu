import { groupCommitments } from "@quipu/backend/shared/commitments";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import AngleDown from "reicon-react-native/icons/AngleDown";
import Plus from "reicon-react-native/icons/Plus";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { CommitmentRow } from "@/features/commitments/commitment-row";
import { dueLine, paidBeforeLine, paymentFrequency } from "@/features/commitments/commitment-text";
import { SAMPLE_COMMITMENTS, SAMPLE_TODAY } from "@/features/home/sample";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { wholeSoles } from "@quipu/backend/shared/budget";
import { useThemeColor } from "@/lib/use-theme-color";

function Title() {
	return <Text className="text-3xl font-semibold text-foreground">Compromisos</Text>;
}

function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
			{children}
		</Text>
	);
}

export function CommitmentsScreen() {
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("--color-foreground");
	const muted = useThemeColor("--color-muted-foreground");
	const [paidBeforeOpen, setPaidBeforeOpen] = useState(false);
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

	const groups = groupCommitments(items);

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
				<Eyebrow>Por pagar este ciclo</Eyebrow>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Añadir compromiso"
					// Luego: hoja F2
					onPress={() => {}}
					className="size-11 shrink-0 items-center justify-center rounded-full bg-secondary active:opacity-60"
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
			{groups.pending.map((item) => (
				<CommitmentRow
					key={item.id}
					name={item.name}
					amountCents={item.amountCents}
					line={dueLine(item, item.status, SAMPLE_TODAY)}
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
						"paid",
						SAMPLE_TODAY,
					)}
					status="paid"
				/>
			))}
			{groups.later.length > 0 ? (
				<View className="mt-[22px]">
					<Eyebrow>Más adelante</Eyebrow>
					{groups.later.map((item) => (
						<CommitmentRow
							key={item.id}
							name={item.name}
							amountCents={item.amountCents}
							line={dueLine(item, "later", SAMPLE_TODAY)}
							status="later"
						/>
					))}
				</View>
			) : null}
			{groups.paidBefore.length > 0 ? (
				<View className="mt-3.5">
					<Pressable
						accessibilityRole="button"
						accessibilityState={{ expanded: paidBeforeOpen }}
						onPress={() => setPaidBeforeOpen(!paidBeforeOpen)}
						className="min-h-11 flex-row items-center justify-between gap-2.5 active:opacity-60"
					>
						<Eyebrow>Pagados antes</Eyebrow>
						<View className={paidBeforeOpen ? "" : "-rotate-90"}>
							<AngleDown size={16} color={muted} />
						</View>
					</Pressable>
					{paidBeforeOpen
						? groups.paidBefore.map((item) =>
								item.status === "paid" ? (
									<CommitmentRow
										key={item.id}
										name={item.name}
										amountCents={item.amountCents}
										line={paidBeforeLine(item, SAMPLE_TODAY)}
										status="paid"
									/>
								) : null,
							)
						: null}
				</View>
			) : null}
		</ScrollView>
	);
}
