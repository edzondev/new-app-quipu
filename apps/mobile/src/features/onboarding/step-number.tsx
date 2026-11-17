import { addDays, formatDay } from "@quipu/backend/shared/dates";
import { Text, View } from "react-native";
import { ListRow } from "@/components/ui/list-row";
import { SectionLabel } from "@/components/ui/section-label";
import { cadenceLabel } from "@/features/cycle/days";
import { DayNumber } from "@/features/home/day-number";
import { amountParts } from "@/features/home/hero";
import { wholeSoles } from "@/features/savings/progress";
import type { Cadence } from "@quipu/backend/shared/plan";
import type { firstNumber } from "./plan";

export function StepNumber({
	cadence,
	todayCents,
	rangeLabel,
	endDate,
	number,
	onOpenFixed,
}: {
	cadence: Cadence;
	todayCents: number;
	rangeLabel: string;
	endDate: string;
	number: ReturnType<typeof firstNumber>;
	onOpenFixed: () => void;
}) {
	const { whole, decimals } = amountParts(number.dailyCents);
	const { envelopes } = number;

	return (
		<View>
			<SectionLabel>Tu número</SectionLabel>
			<Text className="mt-4 text-sm text-muted-foreground">Puedes gastar hoy</Text>
			<View className="mt-1">
				<DayNumber whole={whole} decimals={decimals} size="md" />
			</View>
			<Text className="mt-3 text-sm text-foreground">
				Hoy tienes S/ {wholeSoles(todayCents)} · primer ciclo {rangeLabel}
			</Text>
			<Text className="mt-1 text-[13px] text-muted-foreground">
				Necesidades S/ {wholeSoles(envelopes.needsCents)} · Gustos S/{" "}
				{wholeSoles(envelopes.wantsCents)} · Ahorro S/ {wholeSoles(envelopes.savingsCents)}
			</Text>
			<Text className="mt-1 text-[13px] text-muted-foreground">
				El {formatDay(addDays(endDate, 1))}, día de pago, empieza tu ciclo de{" "}
				{cadenceLabel(cadence).toLowerCase()}.
			</Text>

			<View className="mt-6">
				<ListRow
					label="¿Pagas cosas fijas cada mes?"
					sub="Alquiler, celular, internet… Ahora o después."
					onPress={onOpenFixed}
				/>
			</View>
			{number.overIncome ? (
				<Text accessibilityRole="alert" className="mt-2 text-[13px] text-warning-foreground">
					Los compromisos superan tu ingreso.
				</Text>
			) : null}
		</View>
	);
}
