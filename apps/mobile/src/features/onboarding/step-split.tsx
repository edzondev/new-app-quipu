import { AMOUNT_KEYS, ENVELOPE_LABELS, type EnvelopeAmounts } from "@quipu/backend/shared/budget";
import type { Split } from "@quipu/backend/shared/plan";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Minus from "reicon-react-native/icons/Minus";
import Plus from "reicon-react-native/icons/Plus";
import { wholeSoles } from "@/features/savings/goal-progress";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";
import { SPLIT_STEP, stepSplit } from "./onboarding-plan";

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
			className="size-11 items-center justify-center rounded-full bg-muted"
		>
			{children}
		</Pressable>
	);
}

export function StepSplit({
	split,
	amounts,
	onChange,
	error,
}: {
	split: Split;
	amounts: EnvelopeAmounts;
	onChange: (split: Split) => void;
	error: string | null;
}) {
	const foreground = useThemeColor("--color-foreground");

	return (
		<View>
			<Text className="mb-1 text-4xl leading-[40px] font-semibold text-foreground">
				Así se reparte
			</Text>
			{ORDER.map((envelope) => (
				<View key={envelope} className="border-b border-border py-4">
					<View className="flex-row items-center justify-between">
						<View className="flex-row items-center gap-2.5">
							<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[envelope]}`} />
							<Text className="text-[15px] font-semibold text-foreground">
								{ENVELOPE_LABELS[envelope]}
							</Text>
						</View>
						<View className="flex-row items-center gap-1.5">
							<StepButton
								label={`Bajar ${ENVELOPE_LABELS[envelope]}`}
								onPress={() => onChange(stepSplit(split, envelope, -SPLIT_STEP))}
							>
								<Minus size={16} color={foreground} />
							</StepButton>
							<Text className="w-[52px] text-center font-mono text-[17px] text-foreground">
								{split[envelope]}%
							</Text>
							<StepButton
								label={`Subir ${ENVELOPE_LABELS[envelope]}`}
								onPress={() => onChange(stepSplit(split, envelope, SPLIT_STEP))}
							>
								<Plus size={16} color={foreground} />
							</StepButton>
						</View>
					</View>
					<View className="mt-2.5 flex-row items-center gap-3">
						<View className="h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
							<View
								className={`h-full rounded-full ${ENVELOPE_DOT[envelope]}`}
								style={{ width: `${split[envelope]}%` }}
							/>
						</View>
						<Text className="w-[84px] text-right font-mono text-[13px] text-foreground">
							S/ {wholeSoles(amounts[AMOUNT_KEYS[envelope]])}
						</Text>
					</View>
				</View>
			))}
			<Text className="mt-3 text-[13px] text-muted-foreground">
				Puedes cambiarlo cuando quieras en tus sobres.
			</Text>
			{error ? (
				<Text accessibilityRole="alert" className="mt-2 text-[13px] text-warning-foreground">
					{error}
				</Text>
			) : null}
		</View>
	);
}
