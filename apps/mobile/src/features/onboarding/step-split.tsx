import { AMOUNT_KEYS, ENVELOPE_LABELS, type EnvelopeAmounts } from "@quipu/backend/shared/budget";
import type { Split } from "@quipu/backend/shared/plan";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Minus from "reicon-react-native/icons/Minus";
import Plus from "reicon-react-native/icons/Plus";
import { wholeSoles } from "@/features/savings/progress";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";
import { SPLIT_STEP, stepSplit } from "./plan";

const ORDER = ["needs", "wants", "savings"] as const;

function StepButton({
	label,
	onPress,
	children,
}: {
	label: string;
	onPress: () => void;
	children: ReactNode;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			className="size-11 items-center justify-center rounded-full bg-secondary"
		>
			{children}
		</Pressable>
	);
}

export function StepSplit({
	split,
	amounts,
	onChange,
}: {
	split: Split;
	amounts: EnvelopeAmounts;
	onChange: (split: Split) => void;
}) {
	const foreground = useThemeColor("--color-foreground");

	return (
		<View>
			<Text className="text-4xl leading-10 font-semibold text-foreground">Así se reparte</Text>
			<View className="mt-4">
				{ORDER.map((envelope) => (
					<View
						key={envelope}
						className="min-h-16 flex-row items-center gap-3 border-b border-border py-2"
					>
						<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[envelope]}`} />
						<View className="min-w-0 flex-1">
							<Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
								{ENVELOPE_LABELS[envelope]}
							</Text>
							<Text className="font-mono text-[13px] text-muted-foreground">
								S/ {wholeSoles(amounts[AMOUNT_KEYS[envelope]])}
							</Text>
						</View>
						<StepButton
							label={`Bajar ${ENVELOPE_LABELS[envelope]}`}
							onPress={() => onChange(stepSplit(split, envelope, -SPLIT_STEP))}
						>
							<Minus size={16} color={foreground} />
						</StepButton>
						<Text className="w-12 text-center font-mono text-[15px] text-foreground">
							{split[envelope]}%
						</Text>
						<StepButton
							label={`Subir ${ENVELOPE_LABELS[envelope]}`}
							onPress={() => onChange(stepSplit(split, envelope, SPLIT_STEP))}
						>
							<Plus size={16} color={foreground} />
						</StepButton>
					</View>
				))}
			</View>
			<Text className="mt-3 text-[13px] text-muted-foreground">
				Puedes cambiarlo cuando quieras en tus sobres.
			</Text>
		</View>
	);
}
