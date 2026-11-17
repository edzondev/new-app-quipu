import type { Cadence, CycleStartDay } from "@quipu/backend/shared/plan";
import { NAME_MAX } from "@quipu/backend/shared/name";
import { Text, TextInput, View } from "react-native";
import { ListRow } from "@/components/ui/list-row";
import { CadenceChips } from "@/features/cycle/cadence-chips";
import { startDayLabel } from "@/features/cycle/days";
import { useThemeColor } from "@/lib/use-theme-color";
import { MoneyField } from "./money-field";

export function StepToday({
	name,
	nameError,
	onName,
	todayText,
	todayMissing,
	onToday,
	cadence,
	onCadence,
	startDay,
	rangeLabel,
	onOpenDay,
	incomeText,
	onIncome,
}: {
	name: string;
	nameError: string | null;
	onName: (text: string) => void;
	todayText: string;
	todayMissing: boolean;
	onToday: (text: string) => void;
	cadence: Cadence;
	onCadence: (cadence: Cadence) => void;
	startDay: CycleStartDay;
	rangeLabel: string;
	onOpenDay: () => void;
	incomeText: string;
	onIncome: (text: string) => void;
}) {
	const muted = useThemeColor("--color-muted-foreground");

	return (
		<View>
			<Text className="mb-1 text-sm text-muted-foreground">¿Cómo te llamas?</Text>
			<TextInput
				className={`min-h-11 border-b py-2 text-base text-foreground ${nameError ? "border-warning" : "border-input"}`}
				placeholder="Tu nombre"
				placeholderTextColor={muted}
				autoCapitalize="words"
				autoComplete="given-name"
				textContentType="givenName"
				maxLength={NAME_MAX}
				value={name}
				onChangeText={onName}
				accessibilityLabel="¿Cómo te llamas?"
			/>
			{nameError ? (
				<Text accessibilityRole="alert" className="mt-1.5 text-[13px] text-warning-foreground">
					{nameError}
				</Text>
			) : null}

			<Text className="mt-8 text-4xl leading-10 font-semibold text-foreground">
				¿Cuánto tienes hoy?
			</Text>
			<View className="mt-5">
				<MoneyField value={todayText} onChange={onToday} label="¿Cuánto tienes hoy?" large />
			</View>
			{todayMissing ? (
				<Text accessibilityRole="alert" className="mt-2 text-[13px] text-warning-foreground">
					Escribe cuánto tienes hoy.
				</Text>
			) : null}
			<Text className="mt-3 text-sm text-muted-foreground">
				Lo que tienes ahora para vivir hasta tu próximo pago. Lo repartimos desde hoy.
			</Text>

			<Text className="mt-6 mb-3 text-sm text-muted-foreground">¿Qué día te pagan?</Text>
			<CadenceChips cadence={cadence} onChange={onCadence} />
			<View className="mt-3">
				<ListRow
					label="Te pagan el"
					sub={`Primer ciclo: ${rangeLabel}`}
					value={startDayLabel(cadence, startDay)}
					onPress={onOpenDay}
				/>
			</View>

			<Text className="mt-6 mb-2 text-sm text-muted-foreground">
				¿Cuánto te pagan normalmente? · opcional
			</Text>
			<MoneyField value={incomeText} onChange={onIncome} label="¿Cuánto te pagan normalmente?" />
			<Text className="mt-2 text-[13px] text-muted-foreground">
				Solo para sugerirte el monto el día de pago.
			</Text>
		</View>
	);
}
