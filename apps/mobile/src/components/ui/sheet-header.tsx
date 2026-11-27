import { Pressable, Text, View } from "react-native";
import Animated, { LayoutAnimationConfig } from "react-native-reanimated";
import AngleLeft from "reicon-react-native/icons/AngleLeft";
import { exit, fadeIn } from "@/lib/motion";
import { useThemeColor } from "@/lib/use-theme-color";

/**
 * A sheet closes with its gesture, so the header has no close button. A view one step in passes `onBack`
 * to go back to the form without picking anything. A new title fades in over the old one.
 */
export function SheetHeader({
	title,
	sub,
	onBack,
}: {
	title: string;
	sub?: string;
	onBack?: () => void;
}) {
	const foreground = useThemeColor("--color-foreground");

	return (
		<View className="min-h-11 flex-row items-center gap-1">
			{onBack ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Volver"
					onPress={onBack}
					className="-ml-3 size-11 shrink-0 items-center justify-center active:opacity-60"
				>
					<AngleLeft size={22} color={foreground} />
				</Pressable>
			) : null}
			<LayoutAnimationConfig skipEntering>
				<Animated.View
					key={`${title}-${sub}`}
					entering={fadeIn}
					exiting={exit}
					className="min-w-0 flex-1 justify-center"
				>
					<Text className="text-2xl font-semibold text-foreground">{title}</Text>
					{sub ? (
						<Text className="mt-1 text-[13px] leading-[19px] text-muted-foreground">{sub}</Text>
					) : null}
				</Animated.View>
			</LayoutAnimationConfig>
		</View>
	);
}
