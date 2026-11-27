import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { LayoutAnimationConfig } from "react-native-reanimated";
import { nestedView, rootView } from "@/lib/motion";

/**
 * The body of a sheet that goes to a list and back: `view` is null for the form and names the list.
 * The new body slides in while the old one slides out of the layout, so the two never add up their
 * heights; what sticks out is clipped. The sheet opens on its view without sliding.
 */
export function SheetViews({ view, children }: { view: string | null; children: ReactNode }) {
	return (
		<View className="overflow-hidden">
			<LayoutAnimationConfig skipEntering>
				<Animated.View key={view ?? "root"} {...(view === null ? rootView : nestedView)}>
					{children}
				</Animated.View>
			</LayoutAnimationConfig>
		</View>
	);
}
