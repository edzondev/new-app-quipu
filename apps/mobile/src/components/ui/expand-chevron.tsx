import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import AngleDown from "reicon-react-native/icons/AngleDown";
import { SPRING } from "@/lib/motion";
import { useThemeColor } from "@/lib/use-theme-color";

/** Points down when open and right when closed, turning between them. */
export function ExpandChevron({ open }: { open: boolean }) {
	const muted = useThemeColor("--color-muted-foreground");
	const style = useAnimatedStyle(() => ({
		transform: [{ rotate: withSpring(open ? "0deg" : "-90deg", SPRING.snappy) }],
	}));

	return (
		<Animated.View style={style}>
			<AngleDown size={16} color={muted} />
		</Animated.View>
	);
}
