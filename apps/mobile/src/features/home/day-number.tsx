import { Text, View } from "react-native";

const SIZES = {
	lg: { currency: "mt-2.5 text-2xl", number: "text-[80px]", decimals: "text-[36px]" },
	md: { currency: "mt-1.5 text-xl", number: "text-[56px]", decimals: "text-[26px]" },
} as const;

/** The big number of the day, with its cents smaller. `over` paints it amber. */
export function DayNumber({
	whole,
	decimals,
	over = false,
	size = "lg",
}: {
	whole: string;
	decimals: string;
	over?: boolean;
	size?: keyof typeof SIZES;
}) {
	const classes = SIZES[size];

	return (
		<View className="flex-row items-start">
			<Text className={`mr-1 text-muted-foreground ${classes.currency}`}>S/</Text>
			<Text
				className={`font-mono leading-none tracking-tight ${classes.number} ${over ? "text-warning-foreground" : "text-foreground"}`}
			>
				{whole}
				<Text className={`text-muted-foreground ${classes.decimals}`}>.{decimals}</Text>
			</Text>
		</View>
	);
}
