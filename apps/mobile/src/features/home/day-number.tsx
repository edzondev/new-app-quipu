import { Text, View } from "react-native";

const SIZES = {
	lg: {
		currency: "mt-2.5 text-2xl",
		number: "text-[80px]",
		decimals: "mt-2 text-[36px]",
	},
	md: {
		currency: "mt-1.5 text-xl",
		number: "text-[56px]",
		decimals: "mt-1.5 text-[26px]",
	},
} as const;

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
		<View
			accessible
			accessibilityLabel={`S/ ${whole}.${decimals}`}
			className="flex-row items-start gap-1"
		>
			<Text className={`font-mono text-muted-foreground ${classes.currency}`}>S/</Text>
			<Text
				className={`font-mono leading-none tracking-tight ${classes.number} ${over ? "text-warning-foreground" : "text-foreground"}`}
			>
				{whole}
			</Text>
			<Text
				className={`font-mono leading-none tracking-tight text-muted-foreground ${classes.decimals}`}
			>
				.{decimals}
			</Text>
		</View>
	);
}
