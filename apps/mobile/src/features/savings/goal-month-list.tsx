import { type ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";
import AngleLeft from "reicon-react-native/icons/AngleLeft";
import AngleRight from "reicon-react-native/icons/AngleRight";
import { OptionList } from "@/components/ui/option-list";
import { useThemeColor } from "@/lib/use-theme-color";
import { monthOptions } from "./goal-form";

function YearButton({
	label,
	disabled,
	onPress,
	children,
}: {
	label: string;
	disabled: boolean;
	onPress: () => void;
	children: ReactNode;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			className={`size-11 items-center justify-center active:opacity-60 ${disabled ? "opacity-40" : ""}`}
		>
			{children}
		</Pressable>
	);
}

/** «¿Para cuándo?» (its title is in the sheet header): one year at a time, from this one on, like the web's month grid. Past months are not offered. */
export function GoalMonthList({
	value,
	today,
	onPick,
}: {
	value: string;
	today: string;
	onPick: (month: string) => void;
}) {
	const foreground = useThemeColor("--color-foreground");
	const thisYear = Number(today.slice(0, 4));
	// Starts on the chosen month's year; one already past starts on this year.
	const [year, setYear] = useState(Math.max(thisYear, Number(value.slice(0, 4)) || thisYear));

	return (
		<View>
			<View className="mt-1.5 flex-row items-center justify-between">
				<YearButton
					label="Año anterior"
					disabled={year <= thisYear}
					onPress={() => setYear(year - 1)}
				>
					<AngleLeft size={20} color={foreground} />
				</YearButton>
				<Text className="font-mono text-base text-foreground">{year}</Text>
				<YearButton label="Año siguiente" disabled={false} onPress={() => setYear(year + 1)}>
					<AngleRight size={20} color={foreground} />
				</YearButton>
			</View>
			<OptionList options={monthOptions(year, today)} value={value} onPick={onPick} />
		</View>
	);
}
