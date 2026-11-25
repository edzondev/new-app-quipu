import { ENVELOPE_LABELS, type Envelope } from "@quipu/backend/shared/budget";
import { Text, View } from "react-native";
import { Chips } from "@/components/ui/chips";
import { SectionLabel } from "@/components/ui/section-label";
import {
	EXPENSE_ENVELOPE_LABELS,
	EXPENSE_ENVELOPES,
	type ExpenseEnvelope,
} from "@/features/register/expense";

const TARGETS = ["needs", "wants", "savings"] as const satisfies readonly Envelope[];
const TARGET_LABELS = TARGETS.map((envelope) => ENVELOPE_LABELS[envelope]);

/** J9: an aporte leaves Necesidades or Gustos and enters any envelope of Nuestro espacio. */
export function AporteFields({
	from,
	to,
	line,
	onFromChange,
	onToChange,
}: {
	from: ExpenseEnvelope;
	to: Envelope;
	line: string | null;
	onFromChange: (envelope: ExpenseEnvelope) => void;
	onToChange: (envelope: Envelope) => void;
}) {
	return (
		<View>
			<View className="mt-[18px]">
				<SectionLabel>Sale de</SectionLabel>
			</View>
			<View className="mt-2.5">
				<Chips
					options={EXPENSE_ENVELOPE_LABELS}
					selectedIndex={EXPENSE_ENVELOPES.indexOf(from)}
					onChange={(index) => onFromChange(EXPENSE_ENVELOPES[index])}
				/>
			</View>
			<View className="mt-[18px]">
				<SectionLabel>Entra a · Nuestro espacio</SectionLabel>
			</View>
			<View className="mt-2.5">
				<Chips
					options={TARGET_LABELS}
					selectedIndex={TARGETS.indexOf(to)}
					onChange={(index) => onToChange(TARGETS[index])}
				/>
			</View>
			{line ? (
				<Text className="mt-3.5 text-[13px] leading-[19px] text-muted-foreground">{line}</Text>
			) : null}
		</View>
	);
}
