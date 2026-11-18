import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useThemeColor } from "@/lib/use-theme-color";

/** The top of a sheet in the design: title, an optional line under it and the close button. */
export function SheetHeader({
	title,
	sub,
	onClose,
}: {
	title: string;
	sub?: string;
	onClose: () => void;
}) {
	const foreground = useThemeColor("--color-foreground");

	return (
		<View className="min-h-11 flex-row items-start justify-between gap-3">
			<View className="min-w-0 flex-1">
				<Text className="text-2xl font-semibold text-foreground">{title}</Text>
				{sub ? (
					<Text className="mt-1 text-[13px] leading-[19px] text-muted-foreground">{sub}</Text>
				) : null}
			</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Cerrar"
				onPress={onClose}
				className="size-11 items-end justify-center"
			>
				<Svg
					width={20}
					height={20}
					viewBox="0 0 24 24"
					fill="none"
					stroke={foreground}
					strokeWidth={1.6}
					strokeLinecap="round"
				>
					<Path d="M18 6 6 18M6 6l12 12" />
				</Svg>
			</Pressable>
		</View>
	);
}
