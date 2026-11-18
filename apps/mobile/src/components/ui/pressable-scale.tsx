import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { DURATION, easeOut, SPRING } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that shrinks as soon as the finger lands and springs back on release. For surfaces with a fill or border. */
export function PressableScale({
	scale = 0.97,
	onPressIn,
	onPressOut,
	style,
	...props
}: Omit<PressableProps, "style"> & { scale?: number; style?: StyleProp<ViewStyle> }) {
	const pressed = useSharedValue(1);
	const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressed.get() }] }));

	return (
		<AnimatedPressable
			{...props}
			style={[style, scaleStyle]}
			onPressIn={(event) => {
				pressed.set(withTiming(scale, { duration: DURATION.fast, easing: easeOut }));
				onPressIn?.(event);
			}}
			onPressOut={(event) => {
				pressed.set(withSpring(1, SPRING.snappy));
				onPressOut?.(event);
			}}
		/>
	);
}
